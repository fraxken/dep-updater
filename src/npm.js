/**
 * @namespace npm
 */

// Require Node.js Dependencies
const { spawnSync } = require("child_process");

// Require Third-party Package
const { green, cyan } = require("kleur");

// CONSTANTS
const SPAWN_OPTIONS = { cwd: process.cwd(), env: process.env };
const NPM_CMD = `npm${process.platform === "win32" ? ".cmd" : ""}`;
const KIND_FLAG = new Map([
    ["Dependencies", "-P"],
    ["DevDependencies", "-D"],
    ["OptDependencies", "-O"]
]);

/**
 * @exports npm/update
 * @func update
 * @desc update a given package
 * @memberof npm#
 * @param {Depup.Dependencies} pkg package to install
 * @returns {void}
 */
function update(pkg) {
    const kind = KIND_FLAG.get(pkg.kind);

    if (pkg.updateTo === pkg.wanted) {
        console.log(` > npm update ${green(pkg.name)} ${kind}`);
        spawnSync(NPM_CMD, ["update", pkg.name, kind], SPAWN_OPTIONS);
    }
    else {
        console.log(` > npm remove ${green(pkg.name)} ${kind}`);
        spawnSync(NPM_CMD, ["remove", pkg.name, kind], SPAWN_OPTIONS);

        const completePackageName = `${green(pkg.name)}@${cyan(pkg.updateTo)}`;
        console.log(` > npm install ${completePackageName} ${kind}`);
        spawnSync(NPM_CMD, ["install", completePackageName, kind], SPAWN_OPTIONS);
    }
}

/**
 * @exports npm/rollback
 * @func rollback
 * @desc Rollback package installation
 * @memberof npm#
 * @param {Depup.Dependencies} pkg package to install
 * @returns {void}
 */
function rollback(pkg) {
    const kind = KIND_FLAG.get(pkg.kind);

    console.log(` > npm remove ${green(pkg.name)} ${kind}`);
    spawnSync(NPM_CMD, ["remove", pkg.name, kind], SPAWN_OPTIONS);

    const completePackageName = `${green(pkg.name)}@${cyan(pkg.current)}`;
    console.log(` > npm install ${completePackageName} ${kind}`);
    spawnSync(NPM_CMD, ["install", completePackageName, kind], SPAWN_OPTIONS);
}

module.exports = { update, rollback };
