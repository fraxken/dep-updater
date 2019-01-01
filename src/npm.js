/**
 * @namespace npm
 */

// Require Node.js Dependencies
const { spawnSync } = require("child_process");

// Require Third-party Package
const { green, cyan } = require("kleur");

// Require Internal Dependencies
const { formatCmd } = require("./utils");

// CONSTANTS
const SPAWN_OPTIONS = { cwd: process.cwd(), env: process.env };
const KIND_FLAG = new Map([
    ["Dependencies", "-P"],
    ["DevDependencies", "-D"]
]);

/**
 * @exports npm/update
 * @func update
 * @desc update a given package
 * @memberof npm#
 * @param {Depup.Dependencies} pkg package to install
 * @param {Boolean} [hasPackageLock=false] define is package can be installed with ci
 * @returns {void}
 */
function update(pkg, hasPackageLock = false) {
    const kind = KIND_FLAG.get(pkg.kind);

    if (pkg.updateTo === pkg.wanted) {
        console.log(` > npm update ${green(pkg.name)} ${kind}`);
        spawnSync(formatCmd(`npm update ${pkg.name} ${kind}`), SPAWN_OPTIONS);
    }
    else {
        console.log(` > npm remove ${green(pkg.name)} ${kind}`);
        spawnSync(formatCmd(`npm remove ${pkg.name} ${kind}`), SPAWN_OPTIONS);

        const completePackageName = `${green(pkg.name)}@${cyan(pkg.updateTo)}`;
        const installCMD = hasPackageLock ? "ci" : "install";
        console.log(` > npm ${installCMD} ${completePackageName} ${kind}`);
        spawnSync(formatCmd(`npm ${installCMD} ${completePackageName} ${kind}`), SPAWN_OPTIONS);
    }
}

/**
 * @exports npm/rollback
 * @func rollback
 * @desc Rollback package installation
 * @memberof npm#
 * @param {Depup.Dependencies} pkg package to install
 * @param {Boolean} [hasPackageLock=false] define is package can be installed with ci
 * @returns {void}
 */
function rollback(pkg, hasPackageLock = false) {
    const kind = KIND_FLAG.get(pkg.kind);

    console.log(` > npm remove ${green(pkg.name)} ${kind}`);
    spawnSync(formatCmd(`npm remove ${pkg.name} ${kind}`), SPAWN_OPTIONS);

    const completePackageName = `${green(pkg.name)}@${cyan(pkg.current)}`;
    const installCMD = hasPackageLock ? "ci" : "install";
    console.log(` > npm ${installCMD} ${completePackageName} ${kind}`);
    spawnSync(formatCmd(`npm ${installCMD} ${completePackageName} ${kind}`), SPAWN_OPTIONS);
}

module.exports = { update, rollback };
