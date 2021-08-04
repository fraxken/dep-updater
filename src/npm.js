/**
 * @namespace npm
 */
"use strict";

// Require Node.js Dependencies
const { spawnSync } = require("child_process");

// Require Third-party Package
const { green, bgBlue, yellow, white } = require("kleur");

// CONSTANTS
const SPAWN_OPTIONS = { cwd: process.cwd(), env: process.env, stdio: "inherit" };
const NPM_CMD = `npm${process.platform === "win32" ? ".cmd" : ""}`;
const KIND_FLAG = new Map([
    ["Dependencies", "-P"],
    ["DevDependencies", "-D"],
    ["OptDependencies", "-O"]
]);

/**
 * @exports npm/update
 * @function update
 * @description update a given package
 * @memberof npm#
 * @param {Depup.Dependencies} pkg package to install
 * @returns {object}
 */
function update(pkg) {
    const kind = KIND_FLAG.get(pkg.kind);

    // if (pkg.updateTo === pkg.wanted) {
    //     console.log(` > npm update ${green(pkg.name)} ${kind}`);
    //     const { status } = spawnSync(NPM_CMD, ["update", pkg.name, kind], SPAWN_OPTIONS);

    //     return { status, remove: false };
    // }

    console.log("");
    console.log(bgBlue(yellow().bold(`> npm remove ${white(pkg.name)} ${kind}`)));
    console.log("");
    const { status } = spawnSync(NPM_CMD, ["remove", pkg.name, kind], SPAWN_OPTIONS);
    if (status !== 0) {
        return { status, remove: false };
    }

    const completePackageName = `${pkg.name}@${pkg.updateTo}`;
    console.log("");
    console.log(bgBlue(yellow().bold(`> npm install ${white(completePackageName)} ${kind}`)));
    console.log("");

    const { status: statusBis } = spawnSync(NPM_CMD, ["install", completePackageName, kind], SPAWN_OPTIONS);

    return { status: statusBis, remove: true };
}

/**
 * @exports npm/rollback
 * @function rollback
 * @description Rollback package installation
 * @memberof npm#
 * @param {Depup.Dependencies} pkg package to install
 * @param {boolean} [remove=true] choose to remove first the package
 * @returns {void}
 */
function rollback(pkg, remove = true) {
    const kind = KIND_FLAG.get(pkg.kind);

    if (remove) {
        console.log(` > npm remove ${green(pkg.name)} ${kind}`);
        spawnSync(NPM_CMD, ["remove", pkg.name, kind], SPAWN_OPTIONS);
    }

    const completePackageName = `${pkg.name}@${pkg.current}`;
    console.log(` > npm install ${green(completePackageName)} ${kind}`);
    spawnSync(NPM_CMD, ["install", completePackageName, kind], SPAWN_OPTIONS);
}

module.exports = { update, rollback };
