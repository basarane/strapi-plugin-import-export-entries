const saveEntityJson = async ({ }) => {
    var child_process = require('child_process');
    // const out1 = child_process.execSync('netstat -ano | find "' + port + '" | find "LISTEN"');

    const res = child_process.execSync(`node strapi-scripts/export-data.js`, { stdio: 'inherit' });

    return { success: true, res: res };
}


const commitEntityJson = async ({ branch }) => {
    var child_process = require('child_process');
    const gitAdd = (path) => {
        try {
            return child_process.execSync(`git add ${path}`, { stdio: 'inherit' });
        } catch (e) {
        }
        return "";
    };

    // const out1 = child_process.execSync('netstat -ano | find "' + port + '" | find "LISTEN"');
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
    const currentBranch = child_process.execSync('git branch --show-current').toString().trim();
    const currentDiff = child_process.execSync('git status Entity/ Entity.json public/uploads/ -s').toString().trim();
    const sotkaConfig = require('../../../../../../sotka-config.js');
    return { success: true, res: { config: { ...sotkaConfig, currentBranch: currentBranch, currentDiff: currentDiff } } };
}

const { error } = require('console');
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
    const commandLineParams = [];
    for (const key in payload) {
        const value = payload[key];
        commandLineParams.push(`--${key} ${value}`);
    }
    const getSchema = async () => {
        const models = strapi.db.config.models.filter(p => (p.kind === "collectionType" || p.kind === "singleType") && (!p.pluginOptions || !p.pluginOptions["content-manager"] || p.pluginOptions["content-manager"].visible || p.uid === "plugin::upload.file"));
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
            function removeExtension(filename) {
                return filename.substring(0, filename.lastIndexOf('.')) || filename;
            }
            populateArrayRecursion("", payload.options.attributes);
            const templateRoot = path.join(__dirname, "../../../", "templates");
            let filePath = path.join(templateRoot, payload.options.template);
            let nextRoot = path.join(__dirname, "../../../../../../../", "site"); //payload.options.path
            let nextPath = path.join(nextRoot, "app"); //payload.options.path
            if (!fs.existsSync(nextPath)) {
                fs.mkdirSync(nextPath, { recursive: true });
            }

            const files = await getDirectories(filePath);
            // const files = ["index.js"];
            let libSource = fs.readFileSync(path.join(templateRoot, "lib.js"), 'utf8');

            let cssFileName = removeExtension(payload.options.path).replace(/\//g, "_") + (payload.options.css === "module" ? ".module" : "");
            const cssFile = path.join(nextRoot, "styles", cssFileName + ".less");

            let existingFiles = [];
            for (const file of files) {
                const isIndex = file === "index.js";

                const templateFile = path.join(filePath, file);
                const nextFile = isIndex ? path.join(nextPath, payload.options.path) : path.join(nextPath, path.dirname(payload.options.path), file);
                if (!fs.lstatSync(templateFile).isDirectory() && fs.existsSync(nextFile)) {
                    existingFiles.push(nextFile);
                }
            }
            if (fs.existsSync(cssFile))
                existingFiles.push(cssFile);
            if (existingFiles.length > 0 && !payload.options.overwrite) {
                console.error("File already exists", existingFiles);
                let errorMsg = "File(s) already exists: ";
                errorMsg += "\n\n" + existingFiles.join("\n");
                return { success: false, message: errorMsg };
            }

            for (const file of files) {
                const isIndex = file === "index.js";

                const templateFile = path.join(filePath, file);
                const nextFile = isIndex ? path.join(nextPath, payload.options.path) : path.join(nextPath, path.dirname(payload.options.path), file);

                if (fs.lstatSync(templateFile).isDirectory()) {
                    if (!fs.existsSync(nextFile)) {
                        fs.mkdirSync(nextFile, { recursive: true });
                    }
                } else {
                    let templateSource = fs.readFileSync(templateFile, 'utf8');
                    const templateParams = {
                        componentName: model.globalId,
                        model: model,
                        slug: payload.options.slug,
                        attributes: payload.options.attributes,
                        populateArray: populateArray,
                        css: payload.options.css,
                        cssFileName: cssFileName + ".css",
                        baseDir: path.dirname(payload.options.path),
                        output: {},
                    };
                    const ejsOptions = {
                        views: [templateRoot],
                    }
                    const output = ejs.render(libSource + templateSource, templateParams, ejsOptions);
                    fs.mkdirSync(path.dirname(nextFile), { recursive: true })
                    fs.writeFileSync(nextFile, output);

                    if (payload.options.css !== "none" && isIndex) {
                        function createCssTree(nodes) {
                            let css = "";
                            for (const node of nodes) {
                                css += `.${node.name} {\n`;
                                if (node.children)
                                    css += createCssTree(node.children);
                                css += `}\n`;
                            }
                            return css;
                        }
                        if (templateParams.output.cssTree) {
                            const cssText = createCssTree(templateParams.output.cssTree);
                            fs.writeFileSync(cssFile, cssText);
                        }
                    }
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
