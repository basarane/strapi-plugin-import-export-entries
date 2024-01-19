'use strict';


const registerModelsHooks = async () => {
  const fs = require("fs");
  const stageModels = Object.values(strapi.contentTypes)
    .filter((contentType) => contentType.pluginOptions && contentType.pluginOptions['import-export'] && contentType.pluginOptions['import-export'].stage)
    .map((contentType) => contentType.uid);

  const roles = await strapi
    .service("plugin::users-permissions.role")
    .find();
  const publicRole = roles.filter((role) => role.type === "public")[0];
  if (!publicRole) {
    console.error("No public role found");
    return;
  }

  const _public = await strapi
    .service("plugin::users-permissions.role")
    .findOne(publicRole.id);

  for (const permission of Object.keys(_public.permissions)) {
    for (const controller of Object.keys(
      _public.permissions[permission].controllers
    )) {
      if (permission.startsWith("api") && stageModels.indexOf(`${permission}.${controller}`) >= 0) {
        console.log("ALLOW PUBLIC ACCESS", permission, controller);
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

  const origSotkaConfig = fs.readFileSync("sotka-config.js", "utf8");
  const sotkaConfig = origSotkaConfig.replace(/stageCollections\s*:\s*"[^"]*"/, `stageCollections: "${stageModels.join(",")}"`);
  if (origSotkaConfig !== sotkaConfig) {
    fs.writeFileSync("sotka-config.js", sotkaConfig);
  }
  console.log(sotkaConfig);

  // generic subscribe for generic handling
  strapi.db.lifecycles.subscribe((event) => {
    if (event.action === "afterUpdate") {
      console.log("LIFECYCLE", event);
      let update = {
        uid: event.model.uid,
        params: event.params,
      }
      console.log(update);
    }
  });
  
};
module.exports = async ({ strapi }) => {
  // bootstrap phase
  console.log("BOOTSTRAP");
  await registerModelsHooks();
  console.log("REGISTERED HOOKS");
};
