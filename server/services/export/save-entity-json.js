const saveEntityJson = async ({ }) => {
    console.log("saveEntityJson service called");
    var child_process = require('child_process');
    // const out1 = child_process.execSync('netstat -ano | find "' + port + '" | find "LISTEN"');
    console.log("Current directory:", process.cwd());

    const res = child_process.execSync(`node strapi-scripts/export-data.js`, { stdio: 'inherit' });

    return { success: true, res: res };
}


const commitEntityJson = async ({ branch }) => {
    console.log("commitEntityJson service called", branch);
    var child_process = require('child_process');
    const gitAdd = (path) => {
        try {
            return child_process.execSync(`git add ${path}`, { stdio: 'inherit' });
        } catch (e) {
        }
        return "";
    };

    // const out1 = child_process.execSync('netstat -ano | find "' + port + '" | find "LISTEN"');
    console.log("Current directory:", process.cwd());
    // const res = {someres: true};
    // const res = child_process.execSync(`node strapi-scripts/export-data.js`, { stdio: 'inherit' });
    const currentBranch = child_process.execSync('git branch --show-current').toString().trim();
    const res0 = child_process.execSync(`git pull origin ${currentBranch}`, { stdio: 'inherit' });
    const res1 = gitAdd("Entity/*") + gitAdd("Entity.json") + gitAdd("public/uploads");
    const res2 = child_process.execSync(`git commit -m "Commit from strapi"`, { stdio: 'inherit' });
    let res3, res4, res5, res6, res7;
    const toBranch = branch;
    if (toBranch != currentBranch) {
        res3 = child_process.execSync(`git checkout ${toBranch}`, { stdio: 'inherit' });
        res3 = child_process.execSync(`git pull`, { stdio: 'inherit' });
        res4 = child_process.execSync(`git merge ${currentBranch}`, { stdio: 'inherit' });
        res5 = child_process.execSync(`git push origin ${toBranch}`, { stdio: 'inherit' });
        res7 = child_process.execSync(`git checkout ${currentBranch}`, { stdio: 'inherit' });
    }
    res6 = child_process.execSync(`git push origin ${currentBranch}`, { stdio: 'inherit' });
    return {
        success: true,
        res: " Pull Res: " + res0 +
            " Add Res: " + res1 +
            " Commit Res:" + res2 +
            " Checkout to Res:" + res3 +
            " Merge to current:" + res4 +
            " push to Res:" + res5 +
            " push current Res:" + res7 +
            " checkout current Res:" + res6
    };
}

const loadEntityJsonParams = async ({ }) => {
    var child_process = require('child_process');
    console.log("loadEntityJsonParams service called");
    const currentBranch = child_process.execSync('git branch --show-current').toString().trim();
    const currentDiff = child_process.execSync('git status Entity/ Entity.json public/uploads/ -s').toString().trim();
    const sotkaConfig = require('../../../../../../sotka-config.js');
    console.log("Current directory:", process.cwd());
    return { success: true, res: { config: { ...sotkaConfig, currentBranch: currentBranch, currentDiff: currentDiff } } };
}

const genericApi = async ({ action, payload }) => {
    console.log("genericApi service called", action, payload);
    const commandLineParams = [];
    for (const key in payload) {
        const value = payload[key];
        commandLineParams.push(`--${key} ${value}`);
    }
    switch (action) {
        case "buildStatus":
            var child_process = require('child_process');
            const res = child_process.execSync(`node strapi-scripts/build-status.mjs ${commandLineParams.join(" ")}`).toString().trim();
            var status = res;
            try {
                status = JSON.parse(res);
            } catch (e) {
            }
            return { success: true, buildStatus: status };
        case "getSchema":
            const models = strapi.db.config.models.filter(p => (p.kind === "collectionType" || p.kind === "singleType") && (!p.pluginOptions || !p.pluginOptions["content-manager"] || p.pluginOptions["content-manager"].visible));
            const components = strapi.db.config.models.filter(p => p.modelType === "component" && (!p.pluginOptions || !p.pluginOptions["content-manager"] || p.pluginOptions["content-manager"].visible));
            console.log("getSchema", components);
            return { success: true, models: models, components: components };
    }
    return { success: true };
}

module.exports = {
    saveEntityJson,
    commitEntityJson,
    genericApi,
    loadEntityJsonParams,
};
