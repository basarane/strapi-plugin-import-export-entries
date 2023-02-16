const saveEntityJson = async ({ }) => {
    console.log("saveEntityJson service called");
    var child_process = require('child_process');
    // const out1 = child_process.execSync('netstat -ano | find "' + port + '" | find "LISTEN"');
    console.log("Current directory:", process.cwd());

    const res = child_process.execSync(`node strapi-scripts/export-data.js`, { stdio: 'inherit' });

    return { success: true, res: res };
}

const commitEntityJson = async ({ }) => {
    console.log("commitEntityJson service called");
    var child_process = require('child_process');
    // const out1 = child_process.execSync('netstat -ano | find "' + port + '" | find "LISTEN"');
    console.log("Current directory:", process.cwd());
    // const res = {someres: true};
    // const res = child_process.execSync(`node strapi-scripts/export-data.js`, { stdio: 'inherit' });
    const res0 = child_process.execSync(`git pull origin all`, { stdio: 'inherit' });
    const res1 = child_process.execSync(`git add Entity/*`, { stdio: 'inherit' });
    const res2 = child_process.execSync(`git commit -m "Commit from strapi"`, { stdio: 'inherit' });
    const currentBranch = child_process.execSync('git branch --show-current').toString().trim();
    let res3, res4, res5;
    const toBranch = "staging";
    if (toBranch != currentBranch) {
        res3 = child_process.execSync(`git checkout ${toBranch}`, { stdio: 'inherit' });
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

module.exports = {
    saveEntityJson,
    commitEntityJson
};
