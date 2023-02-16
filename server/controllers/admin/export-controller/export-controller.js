'use strict';

const { CustomSlugs } = require('../../../config/constants');
const { getService } = require('../../../utils');
const { getAllSlugs } = require('../../../utils/models');
const { handleAsyncError } = require('../../content-api/utils');

const exportData = async (ctx) => {
  if (!hasPermissions(ctx)) {
    return ctx.forbidden();
  }

  let { slug, search, applySearch, exportFormat, relationsAsId, deepness = 5 } = ctx.request.body;

  let data;
  if (exportFormat === getService('export').formats.JSON_V2) {
    data = await getService('export').exportDataV2({ slug, search, applySearch, deepness });
  } else {
    data = await getService('export').exportData({ slug, search, applySearch, exportFormat, relationsAsId, deepness });
  }

  ctx.body = {
    data,
  };
};

const hasPermissions = (ctx) => {
  let { slug } = ctx.request.body;
  const { userAbility } = ctx.state;

  const slugs = slug === CustomSlugs.WHOLE_DB ? getAllSlugs() : [slug];

  const allowedSlugs = slugs.filter((slug) => {
    const permissionChecker = strapi.plugin('content-manager').service('permission-checker').create({ userAbility, model: slug });
    return permissionChecker.can.read();
  });

  return !!allowedSlugs.length;
};

const hasPermissions2 = (ctx) => {
  const { userAbility } = ctx.state;
  const slugs = getAllSlugs();
  const allowedSlugs = slugs.filter((slug) => {
    const permissionChecker = strapi.plugin('content-manager').service('permission-checker').create({ userAbility, model: slug });
    return permissionChecker.can.read();
  });

  return !!allowedSlugs.length;
};


const saveEntityJson = async (ctx) => {
  if (!hasPermissions(ctx)) {
    return ctx.forbidden();
  }  
  console.log("export-controller.js: saveEntityJson");
  let data = await getService('export').saveEntityJson({});
  ctx.body = {
    data,
  };
};

const commitEntityJson = async (ctx) => {
  console.log("export-controller.js: commitEntityJson: ctx.request.body=" + JSON.stringify(ctx.request.body));
  if (!hasPermissions2(ctx)) {
    return ctx.forbidden();
  }  
  let { branch } = ctx.request.body;
  console.log("export-controller.js: commitEntityJson");
  let data = await getService('export').commitEntityJson({branch});
  ctx.body = {
    data,
  };
};

const loadEntityJsonParams = async (ctx) => {
  console.log("export-controller.js: loadEntityJsonParams: ctx.request.body=" + JSON.stringify(ctx.request.body));
  if (!hasPermissions(ctx)) {
    return ctx.forbidden();
  }  
  console.log("export-controller.js: loadEntityJsonParams");
  let data = await getService('export').loadEntityJsonParams({});
  ctx.body = {
    data,
  };
};

module.exports = ({ strapi }) => ({
  exportData: handleAsyncError(exportData),
  saveEntityJson: handleAsyncError(saveEntityJson),
  commitEntityJson: handleAsyncError(commitEntityJson),
  loadEntityJsonParams: handleAsyncError(loadEntityJsonParams),
});
