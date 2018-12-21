#!/usr/bin/env node
require("make-promises-safe");

// Require Third-party Dependencies
const { gray, green, bold, yellow } = require("kleur");
const cross = require("cross-spawn");
const inquirer = require("inquirer");

// Require Internal Dependencies
const { parseOutDatedDependencies } = require("../src/utils");
const questions = require("../src/questions.json");

async function main() {
    console.log(`\n${gray(" > npm outdated --json")}`);
    const { stdout } = cross.sync("npm", ["outdated", "--json"]);
    const outdated = parseOutDatedDependencies(stdout);

    // Define list of packages to update!
    const packageToUpdate = [];
    for (const pkg of outdated) {
        if (pkg.current === pkg.latest) {
            continue;
        }

        console.log(`\n-> ${bold(green(pkg.name))} (${yellow(pkg.current)})`);
        const { update } = await inquirer.prompt([questions.update_package]);
        if (!update) {
            continue;
        }

        pkg.updateTo = pkg.wanted;
        if (pkg.wanted !== pkg.latest && pkg.current !== pkg.wanted) {
            const { release } = await inquirer.prompt([{
                type: "list",
                name: "release",
                choices: [
                    { name: `wanted (${yellow(pkg.wanted)})`, value: pkg.wanted },
                    { name: `latest (${yellow(pkg.latest)})`, value: pkg.latest }
                ],
                default: 0
            }]);

            pkg.updateTo = release;
        }

        packageToUpdate.push(pkg);
    }

    // Configuration
    console.log(`\n${gray(" > Configuration")}\n`);
    const { runTest, gitCommit } = await inquirer.prompt([
        questions.run_test,
        questions.git_commit
    ]);

    // Verify test and git on the local root/system

    // Run updates!
}
main().catch(console.erorr);
