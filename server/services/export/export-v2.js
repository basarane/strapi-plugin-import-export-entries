const cloneDeep = require('lodash/cloneDeep');
const flattenDeep = require('lodash/flattenDeep');
const fromPairs = require('lodash/fromPairs');
const { isEmpty, merge } = require('lodash/fp');
const qs = require('qs');
const { isArraySafe, toArray } = require('../../../libs/arrays');

const { ObjectBuilder, isObjectSafe, mergeObjects } = require('../../../libs/objects');
const { CustomSlugToSlug, CustomSlugs } = require('../../config/constants');
const { getModelAttributes, getAllSlugs } = require('../../utils/models');
const { convertToJson } = require('./converters-v2');

const omit = require('lodash/omit');

const dataFormats = {
  JSON: 'json',
};

const dataConverterConfigs = {
  [dataFormats.JSON]: {
    convertEntries: convertToJson,
  },
};

/**
 * Export data.
 * @param {Object} options
 * @param {string} options.slug
 * @param {string} options.search
 * @param {boolean} options.applySearch
 * @param {boolean} options.relationsAsId
 * @param {number} options.deepness
 * @returns {string}
 */

const pruneHierarchy = (orig, hierarchy) => {
  if (!hierarchy)
    return orig;
  let fields = Object.keys(orig);
  for (let i = 0; i < fields.length; i++) {
    if (fields[i] !== "__slug" && !hierarchy[fields[i]]) {
      delete orig[fields[i]];
    }
  }
};
const exportDataV2 = async ({ slug, search, applySearch, deepness = 5, hierarchy = null, populate = null }) => {
  slug = CustomSlugToSlug[slug] || slug;

  let entries = {};
  if (slug === CustomSlugs.WHOLE_DB) {
    for (const slug of getAllSlugs()) {
      const hierarchyOrig = buildSlugHierarchy(slug, deepness);
      pruneHierarchy(hierarchyOrig, hierarchy);
      const slugEntries = await findEntriesForHierarchy(slug, hierarchyOrig, deepness, { ...(applySearch ? { search } : {}), populate });
      entries = mergeObjects(entries, slugEntries);
    }
  } else {
    const slugs = slug.split(",");
    for (const slug of slugs) {
      const hierarchyOrig = buildSlugHierarchy(slug, deepness);
      pruneHierarchy(hierarchyOrig, hierarchy);
      console.log("exportDataV2", slug, hierarchyOrig, populate);
      const slugEntries = await findEntriesForHierarchy(slug, hierarchyOrig, deepness, { ...(applySearch ? { search } : {}), populate });
      entries = mergeObjects(entries, slugEntries);
    }
  }

  const jsoContent = {
    version: 2,
    data: entries,
  };

  const fileContent = convertData(jsoContent, {
    slug,
    dataFormat: 'json',
  });

  return fileContent;
};

const findEntriesForHierarchy = async (slug, hierarchy, deepness, { search, ids, populate }) => {
  let storedData = {};

  if (slug === 'admin::user') {
    return storedData;
  }
  let entries = await findEntries(slug, deepness, populate, { search, ids })
    .then((entries) => {
      entries = toArray(entries).filter(Boolean);
      const isModelLocalized = !!hierarchy?.localizations;

      // Export locales
      if (isModelLocalized) {
        const allEntries = [...entries];
        const entryIdsToExported = fromPairs(allEntries.map((entry) => [entry.id, true]));

        for (const entry of entries) {
          entry.localizations.forEach((locale) => {
            if (!entryIdsToExported[locale.id]) {
              allEntries.push(locale);
              entryIdsToExported[locale.id] = true;
            }
          });
        }

        return allEntries;
      }

      return entries;
    })
    .then((entries) => toArray(entries));

  // Transform relations as ids.
  let entriesFlatten = cloneDeep(entries);
  (() => {
    const flattenEntryDynamicZone = (dynamicZoneEntries) => {
      if (isArraySafe(dynamicZoneEntries)) {
        return dynamicZoneEntries.map((entry) => ({
          __component: entry.__component,
          id: entry.id,
        }));
      }
      return dynamicZoneEntries;
    };

    const flattenEntryCommon = (entry) => {
      if (entry == null) {
        return null;
      } else if (isArraySafe(entry)) {
        return entry.map((rel) => {
          if (typeof rel === 'object') {
            return rel.id;
          }
          return rel;
        });
      } else if (isObjectSafe(entry)) {
        return entry.id;
      }
      return entry;
    };

    const flattenEntry = (entry, slug) => {
      const attributes = getModelAttributes(slug, { filterType: ['component', 'dynamiczone', 'media', 'relation'] });

      attributes.forEach((attribute) => {
        const flattener = attribute.type === 'dynamiczone' ? flattenEntryDynamicZone : flattenEntryCommon;
        entry[attribute.name] = flattener(entry[attribute.name]);
      });

      return entry;
    };

    entriesFlatten = entriesFlatten.map((entry) => flattenEntry(entry, slug));
  })();

  storedData = mergeObjects({ [slug]: Object.fromEntries(entriesFlatten.map((entry) => [entry.id, entry])) }, storedData);

  // Skip admin::user slug.
  (() => {
    const relations = getModelAttributes(slug, { filterType: ['relation'] });

    return entries.map((entry) => {
      relations.forEach((relation) => {
        if (relation.target === 'admin::user') {
          delete entry[relation.name];
        }
      });
      return entry;
    });
  })();

  await (async () => {
    let attributes = getModelAttributes(slug, { filterType: ['component'] });
    for (const attribute of attributes) {
      if (!hierarchy[attribute.name]?.__slug) {
        continue;
      }

      const ids = flattenDeep(
        entries
          .filter((entry) => !!entry[attribute.name])
          .map((entry) => entry[attribute.name])
          .map(toArray)
          .map((entryArray) => entryArray.filter((entry) => !!entry.id).map((entry) => entry.id)),
      );

      const subStore = await findEntriesForHierarchy(hierarchy[attribute.name].__slug, hierarchy[attribute.name], deepness - 1, { ids });
      storedData = mergeObjects(subStore, storedData);
    }
  })();

  await (async () => {
    let attributes = getModelAttributes(slug, { filterType: ['dynamiczone'] });
    for (const attribute of attributes) {
      for (const componentSlug of attribute.components) {
        const componentHierarchy = hierarchy[attribute.name]?.[componentSlug];
        if (!componentHierarchy?.__slug) {
          continue;
        }

        const componentEntries = flattenDeep(
          entries
            .map((entry) => {
              return entry;
            })
            .filter((entry) => !!entry[attribute.name])
            .map((entry) => entry[attribute.name]),
        ).filter((entry) => entry?.__component === componentSlug);

        const ids = componentEntries.map((entry) => entry.id);

        const subStore = await findEntriesForHierarchy(componentHierarchy.__slug, componentHierarchy, deepness - 1, { ids });
        storedData = mergeObjects(subStore, storedData);
      }
    }
  })();

  await (async () => {
    let attributes = getModelAttributes(slug, { filterType: ['media'] });
    for (const attribute of attributes) {
      if (!hierarchy[attribute.name]?.__slug) {
        continue;
      }

      const ids = flattenDeep(
        entries
          .filter((entry) => !!entry[attribute.name])
          .map((entry) => entry[attribute.name])
          .map(toArray)
          .map((entryArray) => entryArray.filter((entry) => !!entry.id).map((entry) => entry.id)),
      );

      const subStore = await findEntriesForHierarchy(hierarchy[attribute.name].__slug, hierarchy[attribute.name], deepness - 1, { ids });
      storedData = mergeObjects(subStore, storedData);
    }
  })();

  await (async () => {
    let attributes = getModelAttributes(slug, { filterType: ['relation'] });
    for (const attribute of attributes) {
      if (!hierarchy[attribute.name]?.__slug) {
        continue;
      }

      const ids = flattenDeep(
        entries
          .filter((entry) => !!entry[attribute.name])
          .map((entry) => entry[attribute.name])
          .map(toArray)
          .map((entryArray) => entryArray.filter((entry) => !!entry.id).map((entry) => entry.id)),
      );

      const subStore = await findEntriesForHierarchy(hierarchy[attribute.name].__slug, hierarchy[attribute.name], deepness - 1, { ids });
      storedData = mergeObjects(subStore, storedData);
    }
  })();

  return storedData;
};

const findEntries = async (slug, deepness, populate, { search, ids }) => {
  try {
    const queryBuilder = new ObjectBuilder();
    queryBuilder.extend(getPopulateFromSchema(slug, deepness, populate));
    if (search) {
      queryBuilder.extend(buildFilterQuery(search));
    } else if (ids) {
      queryBuilder.extend({
        filters: {
          id: { $in: ids },
        },
      });
    }
    let entries = await strapi.entityService.findMany(slug, queryBuilder.get());
    if (!Array.isArray(entries)) {
      entries = [entries];
    }

    return entries.map((entry) => omit(entry, ['updatedAt', 'createdAt'])); // @ersin - omit updatedAt and createdAt
  } catch (_) {
    return [];
  }
};

const buildFilterQuery = (search) => {
  let { filters, sort: sortRaw } = qs.parse(search);

  const [attr, value] = sortRaw?.split(':') || [];
  let sort = {};
  if (attr && value) {
    sort[attr] = value.toLowerCase();
  }

  return {
    filters,
    sort,
  };
};

/**
 *
 * @param {Object} data
 * @param {Array<Object>} data.entries
 * @param {Record<string, any>} data.hierarchy
 * @param {Object} options
 * @param {string} options.slug
 * @param {string} options.dataFormat
 * @param {boolean} options.relationsAsId
 * @returns
 */
const convertData = (data, options) => {
  const converter = getConverter(options.dataFormat);

  const convertedData = converter.convertEntries(data, options);
  return convertedData;
};

const getConverter = (dataFormat) => {
  const converter = dataConverterConfigs[dataFormat];

  if (!converter) {
    throw new Error(`Data format ${dataFormat} is not supported.`);
  }

  return converter;
};

const getPopulateFromSchema = (slug, deepness = 5, populate = null) => {
  if (deepness <= 1) {
    return true;
  }

  if (slug === 'admin::user') {
    return undefined;
  }
  const populateOriginal = populate;
  if (populate)
    return { populate };

  populate = {};
  const model = strapi.getModel(slug);
  for (const [attributeName, attribute] of Object.entries(getModelPopulationAttributes(model))) {
    if (!attribute) {
      continue;
    }

    if (attribute.type === 'component') {
      populate[attributeName] = getPopulateFromSchema(attribute.component, deepness - 1);
    } else if (attribute.type === 'dynamiczone') {
      const dynamicPopulate = attribute.components.reduce((zonePopulate, component) => {
        const compPopulate = getPopulateFromSchema(component, deepness - 1);
        return compPopulate === true ? zonePopulate : merge(zonePopulate, compPopulate);
      }, {});
      populate[attributeName] = isEmpty(dynamicPopulate) ? true : dynamicPopulate;
    } else if (attribute.type === 'relation') {
      const relationPopulate = getPopulateFromSchema(attribute.target, deepness - 1);
      if (relationPopulate) {
        populate[attributeName] = relationPopulate;
      }
    } else if (attribute.type === 'media') {
      populate[attributeName] = true;
    }
  }
  return isEmpty(populate) ? true : { populate };
};

const buildSlugHierarchy = (slug, deepness = 5) => {
  slug = CustomSlugToSlug[slug] || slug;

  if (deepness <= 1) {
    return { __slug: slug };
  }

  const hierarchy = {
    __slug: slug,
  };

  const model = strapi.getModel(slug);
  for (const [attributeName, attribute] of Object.entries(getModelPopulationAttributes(model))) {
    if (!attribute) {
      continue;
    }
    if (attribute.type === 'component') {
      hierarchy[attributeName] = buildSlugHierarchy(attribute.component, deepness - 1);
    } else if (attribute.type === 'dynamiczone') {
      hierarchy[attributeName] = Object.fromEntries(attribute.components.map((componentSlug) => [componentSlug, buildSlugHierarchy(componentSlug, deepness - 1)]));
    } else if (attribute.type === 'relation') {
      const relationHierarchy = buildSlugHierarchy(attribute.target, deepness - 1);
      if (relationHierarchy) {
        hierarchy[attributeName] = relationHierarchy;
      }
    } else if (attribute.type === 'media') {
      hierarchy[attributeName] = buildSlugHierarchy(CustomSlugs.MEDIA, deepness - 1);
    }
  }

  return hierarchy;
};

const getModelPopulationAttributes = (model) => {
  if (model.uid === 'plugin::upload.file') {
    const { related, ...attributes } = model.attributes;
    // return omit(attributes, ['updatedAt']);
    return attributes;
  }
  // return omit(model.attributes, ['updatedAt']);
  return model.attributes;
};

module.exports = {
  exportDataV2,
};
