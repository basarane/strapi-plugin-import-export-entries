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

  const currentRecords = {};
  const componentUpdates = {};
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

    const logEvents = ["afterUpdate", "afterCreate", "afterUpdateMany", "afterCreateMany", "afterDelete", "afterDeleteMany", "beforeUpdate"];
    if (!event.model.uid.startsWith("admin::"))
      console.log("EVENT", event.action, event.model.uid, event.params.data && event.params.data.id)
    if (logEvents.indexOf(event.action) >= 0 && !event.model.uid.startsWith("strapi::") && !event.params.change_update) {
      let update = {
        uid: event.model.uid,
        action: event.action.substring(5),
        model: event.model,
        params: event.params,
      }
      if (event.action === "afterCreate") {
        update.params.data.id = event.result.id;
      }
      if (event.action === "afterUpdate") {
        const current = currentRecords[event.model.uid][update.params.data.id];
        if (event.model.modelType !== "component") {
          update.initial = current;
        }
        // const updated = diff.updatedDiff(current, event.result)
        // if (Object.keys(updated).length === 0) {
        //   return;
        // }
        // console.log("UPDATED", event.model.uid, update.params.data.id, updated);
        // update.params.data = updated;
      }
      if (event.action === "beforeUpdate") {
        let current = null;
        if (event.model.kind === "collectionType")
          current = await strapi.query(event.model.uid).findOne({ id: update.params.data.id, populate: update.params.populate });
        else
          current = (await strapi.query(event.model.uid).findMany({ where: { id: { $eq: update.params.data.id } }, populate: update.params.populate }))[0];

        // console.log("Current values fetched", event.model.uid, update.params.data.id, current);
        if (!currentRecords[event.model.uid]) {
          currentRecords[event.model.uid] = {};
        }
        currentRecords[event.model.uid][update.params.data.id] = current;
      } else {
        if (event.model.modelType !== "component") {
          // update.params.data
          writeJsonToFile({
            forward: addRelatedUpdates(update)
          });
        }
        // console.log(event);
        if (event.model.modelType === "component") {
          if (!componentUpdates[event.model.uid]) {
            componentUpdates[event.model.uid] = {};
          }
          if (event.params.data)
            componentUpdates[event.model.uid][event.params.data.id] = addRelatedUpdates(update);
        }
      }

      // Write the data to a JSON file
    }
  });

};
module.exports = async ({ strapi }) => {
  // bootstrap phase
  console.log("BOOTSTRAP");
  await registerModelsHooks();
  console.log("REGISTERED HOOKS");
};
