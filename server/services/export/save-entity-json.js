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

const glob = require("glob");
const { template } = require('lodash');
const path = require("path");

const globPromise = (pattern, options) => new Promise((resolve, reject) => {
    glob(pattern, options, (err, files) => {
        if (err) {
            reject(err);
        } else {
            resolve(files);
        }
    });
});

let getDirectories = async (src) => {
    return (await globPromise(src + '/**/*')).map(p => path.relative(src, p));
};


const genericApi = async ({ action, payload }) => {
    console.log("genericApi service called", action, payload);
    const commandLineParams = [];
    for (const key in payload) {
        const value = payload[key];
        commandLineParams.push(`--${key} ${value}`);
    }
    const getSchema = async () => {
        const models = strapi.db.config.models.filter(p => (p.kind === "collectionType" || p.kind === "singleType") && (!p.pluginOptions || !p.pluginOptions["content-manager"] || p.pluginOptions["content-manager"].visible));
        const components = strapi.db.config.models.filter(p => p.modelType === "component" && (!p.pluginOptions || !p.pluginOptions["content-manager"] || p.pluginOptions["content-manager"].visible));
        return {
            models: models,
            components: components,
        }
    }
    let schema = null;
    if (["generate", "getSchema"].indexOf(action) >= 0)
        schema = await getSchema();

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
            return { success: true, models: schema.models, components: schema.components };
        case "generate":
            console.log("generate", payload, __dirname);
            let fs = require('fs');
            let path = require('path');
            const ejs = require('ejs');

            const model = schema.models.find(p => p.uid === payload.options.collection);
            const populateArray = [];
            function populateArrayRecursion(prefix, attributes) {
                for (const attribute of attributes) {
                    const path = (prefix ? prefix + "." : "") + attribute.name;
                    if (attribute.attributes && !attribute.attributes.find(p => p.attributes))
                        populateArray.push(path);
                    else if (attribute.attributes)
                        populateArrayRecursion(path, attribute.attributes);
                }
            }
            populateArrayRecursion("", payload.options.attributes);
            let filePath = path.join(__dirname, "../../../", "templates", payload.options.template);
            let nextPath = path.join(__dirname, "../../../../../../../", "site", payload.options.path);
            if (!fs.existsSync(nextPath)) {
                fs.mkdirSync(nextPath, { recursive: true });
            }

            const files = await getDirectories(filePath);
            console.log("generate", filePath, files, nextPath);
            for (const file of files) {
                const templateFile = path.join(filePath, file);
                const nextFile = path.join(nextPath, file);
                if (fs.lstatSync(templateFile).isDirectory()) {
                    if (!fs.existsSync(nextFile)) {
                        fs.mkdirSync(nextFile, { recursive: true });
                    }
                } else {
                    if (fs.existsSync(nextFile)) {
                        console.error("File already exists", nextFile);
                        // continue;
                    }

                    let templateSource = fs.readFileSync(templateFile, 'utf8');

                    const templateParams = {
                        componentName: model.globalId,
                        modelName: model.info.pluralName,
                        slug: payload.options.slug,
                        attributes: payload.options.attributes,
                        populateArray: populateArray,
                    };
                    const output = ejs.render(templateSource, templateParams);
                    fs.writeFileSync(nextFile, output);
                    // fs.copyFileSync(templateFile, nextFile);
                }
            }
            return { success: true };

    }
    return { success: true };
}

module.exports = {
    saveEntityJson,
    commitEntityJson,
    genericApi,
    loadEntityJsonParams,
};
