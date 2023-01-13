const saveEntityJson = async ({ }) => {
    console.log("saveEntityJson service called");
    var child_process = require('child_process');
    // const out1 = child_process.execSync('netstat -ano | find "' + port + '" | find "LISTEN"');
    console.log("Current directory:", process.cwd());

    const res = child_process.execSync(`node strapi-scripts/export-data.js`, { stdio: 'inherit' });

    return { success: true, res: res };
}

module.exports = {
    saveEntityJson,
};
