'use strict';

const { isArray } = require("lodash");


const registerModelsHooks = async () => {
  const fs = require("fs");
  const stageModels = Object.values(strapi.contentTypes)
    .filter((contentType) => contentType.pluginOptions && contentType.pluginOptions['import-export'] && contentType.pluginOptions['import-export'].stage)
    .map((contentType) => contentType.uid);

  const roles = await strapi
    .service("plugin::users-permissions.role")
    .find();
  const publicRole = roles.filter((role) => role.type === "public")[0];
  if (publicRole) {
    const _public = await strapi
      .service("plugin::users-permissions.role")
      .findOne(publicRole.id);

    for (const permission of Object.keys(_public.permissions)) {
      for (const controller of Object.keys(
        _public.permissions[permission].controllers
      )) {
        if (permission.startsWith("api") && stageModels.indexOf(`${permission}.${controller}`) >= 0) {
          const perms = _public.permissions[permission].controllers[
            controller
          ];
          perms.find.enabled = true;
          if (perms.findOne)
            perms.findOne.enabled = true;
        }
      }
    }
    await strapi
      .service("plugin::users-permissions.role")
      .updateRole(_public.id, _public);
  }

  try {
    const origSotkaConfig = fs.readFileSync("sotka-config.js", "utf8");
    const sotkaConfig = origSotkaConfig.replace(/stageCollections\s*:\s*"[^"]*"/, `stageCollections: "${stageModels.join(",")}"`);
    if (origSotkaConfig !== sotkaConfig) {
      fs.writeFileSync("sotka-config.js", sotkaConfig);
    }
  } catch (e) {
  }

  const sotkaConfigObj = require("../../../../sotka-config.js");

  if (sotkaConfigObj.enableChanges) {
    const currentRecords = {};
    const componentUpdates = {};
    const parentIds = {};
    const deletedRelations = {};

    // generic subscribe for generic handling
    strapi.db.lifecycles.subscribe(async (event) => {
      const fs = require('fs');
      const path = require('path');
      const diff = require('deep-object-diff');

      const dirPath = path.join(__dirname, '../../../../', 'changes');
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
      }

      // Function to format the date as YYYYMMDDHHMMSS
      function getFormattedDate() {
        const now = new Date();
        return now.toISOString().replace(/[\-T:\.Z]/g, '').slice(0, 14);
      }

      // Function to create a unique filename
      function getUniqueFilename(dateStr) {
        let counter = 0;
        let uniqueFilename;

        do {
          uniqueFilename = path.join(dirPath, `${dateStr}${counter ? `_${counter}` : ''}.json`);
          counter++;
        } while (fs.existsSync(uniqueFilename));

        return uniqueFilename;
      }

      // Function to write the JSON file
      function writeJsonToFile(data) {
        const dateStr = getFormattedDate();
        const filename = getUniqueFilename(dateStr);
        const jsonData = JSON.stringify(data, null, 4); // Pretty print JSON

        fs.writeFileSync(filename, jsonData, 'utf8');
      }

      function findEntriesWithPivot(obj, results = []) {
        if (Array.isArray(obj)) {
          // If it's an array, loop through each element
          obj.forEach(element => findEntriesWithPivot(element, results));
        } else if (obj !== null && typeof obj === 'object') {
          // If it's an object, check for __pivot and then recursively check its properties
          if (obj.hasOwnProperty('__pivot')) {
            results.push(obj);
          }
          Object.values(obj).forEach(value => findEntriesWithPivot(value, results));
        }
        return results;
      }
      function addRelatedUpdates(update) {
        const entriesWithPivot = findEntriesWithPivot(update.params.data);
        // pivotUpdates = entriesWithPivot.map(entry => (componentUpdates[entry.__pivot.component_type][entry.id] || []))
        let updates = [];

        if (update.params.data?.id) {
          if (deletedRelations[update.model.uid]) {
            deletedRelations[update.model.uid].forEach((item) => {
              if (componentUpdates[item.uid][item.id])
                updates.push(componentUpdates[item.uid][item.id])
            });
          }
        }
        for (const entry of entriesWithPivot) {
          let subUpdate = null;
          if (entry.__pivot.component_type) {
            subUpdate = componentUpdates[entry.__pivot.component_type][entry.id];
          }
          if (entry.__component) {
            subUpdate = componentUpdates[entry.__component][entry.id];
          }
          if (subUpdate) {
            // updates.push(subUpdate);
            updates = updates.concat(subUpdate);
          }
        }
        updates.push(update);
        return updates;
      }

      function stripModel(updates) {
        return updates.map((update) => {
          let newUpdate = { ...update };
          delete newUpdate.model;
          return newUpdate;
        });
      }

      //"afterDeleteMany", 
      const logEvents = ["afterFindOne", "afterUpdate", "afterCreate", "afterUpdateMany", "afterCreateMany", "afterDelete", "beforeUpdate"];

      if (logEvents.indexOf(event.action) >= 0 && !event.model.uid.startsWith("strapi::") && !event.model.uid.startsWith("admin::") && !event.model.uid.startsWith("plugin::") && !event.params.change_update) {
        let update = {
          uid: event.model.uid,
          action: event.action.substring(5),
          model: event.model,
          params: event.params,
        }
        if (!update.params.data) {
          update.params.data = {};
        }
        if (event.action === "afterCreate") {
          update.params.data.id = event.result.id;
        }
        if (event.action === "afterDelete") {
          update.params.data.id = event.result.id;
        }
        if (event.action === "afterDelete") {
          if (parentIds[event.model.uid] && parentIds[event.model.uid][event.result.id]) {
            const parent = parentIds[event.model.uid][event.result.id];
            if (!deletedRelations[parent.uid])
              deletedRelations[parent.uid] = [];
            deletedRelations[parent.uid].push({ uid: event.model.uid, id: event.result.id });
          }
        }
        if (event.action === "afterUpdate") {
          const current = currentRecords[event.model.uid][update.params.data.id][0];
          if (event.model.modelType !== "component") {
            update.initial = current;
          }
          // const updated = diff.updatedDiff(current, event.result)
          // if (Object.keys(updated).length === 0) {
          //   return;
          // }
          // update.params.data = updated;
        }
        if (event.action === "beforeUpdate") {
          // let current = null;
          // if (event.model.kind === "collectionType")
          //   current = await strapi.query(event.model.uid).findOne({ id: update.params.data.id, populate: update.params.populate });
          // else
          //   current = (await strapi.query(event.model.uid).findMany({ where: { id: { $eq: update.params.data.id } }, populate: update.params.populate }))[0];

          // if (!currentRecords[event.model.uid]) {
          //   currentRecords[event.model.uid] = {};
          // }
          // currentRecords[event.model.uid][update.params.data.id] = current;
        } else if (event.action === "afterFindOne") {
          if (!currentRecords[event.model.uid]) {
            currentRecords[event.model.uid] = {};
          }
          // if (!currentRecords[event.model.uid][event.result.id]) {
          //   currentRecords[event.model.uid][event.result.id] = [];
          // }
          // currentRecords[event.model.uid][event.result.id].push(event.result);
          // currentRecords[event.model.uid][event.result.id].slice(-1);
          currentRecords[event.model.uid][event.result.id] = [event.result];
          if (event.params.populate) {
            let populate = event.params.populate;
            if (isArray(populate)) {
              populate = {};
              event.params.populate.forEach((item) => {
                populate[item] = true;
              });
            }
            Object.keys(populate).forEach((key) => {
              if (!event.model.__schema__.attributes[key])
                return;
              if (["component", "dynamiczone"].indexOf(event.model.__schema__.attributes[key].type) >= 0) {
                let comp = event.model.__schema__.attributes[key].component;
                let data = event.result[key];
                if (!Array.isArray(data)) {
                  data = [data];
                }
                data.forEach((item) => {
                  if (item.__component) {
                    comp = item.__component;
                  }
                  if (!parentIds[comp]) {
                    parentIds[comp] = {};
                  }
                  parentIds[comp][item.id] = { uid: event.model.uid, id: event.result.id };
                });
              }
            });
          }
        } else {
          if (event.model.modelType !== "component") {
            writeJsonToFile({
              forward: stripModel(addRelatedUpdates(update))
            });
          }
          if (event.model.modelType === "component") {
            if (!componentUpdates[event.model.uid]) {
              componentUpdates[event.model.uid] = {};
            }
            if (event.params.data)
              componentUpdates[event.model.uid][event.params.data.id] = addRelatedUpdates(update);
          }
        }
        // writeJsonToFile({
        //   event
        // });

        // Write the data to a JSON file
      }
    });
  }
};
module.exports = async ({ strapi }) => {
  // bootstrap phase
  await registerModelsHooks();
};
