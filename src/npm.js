/**
 * @namespace npm
 */

// Require Third-party Package
const { green, cyan } = require("kleur");
const cross = require("cross-spawn");

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
        cross.sync("npm", ["update", pkg.name, kind]);
    }
    else {
        console.log(` > npm remove ${green(pkg.name)} ${kind}`);
        cross.sync("npm", ["remove", pkg.name, kind]);

        const completePackageName = `${green(pkg.name)}@${cyan(pkg.updateTo)}`;
        const installCMD = hasPackageLock ? "ci" : "install";
        console.log(` > npm ${installCMD} ${completePackageName} ${kind}`);
        cross.sync("npm", [installCMD, completePackageName, kind]);
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
    cross.sync("npm", ["remove", pkg.name, kind]);

    const completePackageName = `${green(pkg.name)}@${cyan(pkg.current)}`;
    const installCMD = hasPackageLock ? "ci" : "install";
    console.log(` > npm ${installCMD} ${completePackageName} ${kind}`);
    cross.sync("npm", [installCMD, completePackageName, kind]);
}

module.exports = { update, rollback };
