/**
 * @namespace Utils
 */

/**
 * @func parseOutDatedDependencies
 * @memberof Utils#
 * @param {!Buffer} stdout stdout
 * @returns {Depup.Dependencies[]}
 */
function parseOutDatedDependencies(stdout) {
    const result = JSON.parse(stdout.toString());

    for (const [name, pkg] of Object.entries(result)) {
        pkg.name = name;
        pkg.breaking = pkg.wanted !== pkg.latest;
    }

    return Object.values(result);
}

module.exports = {
    parseOutDatedDependencies
};
