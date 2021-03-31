#!/usr/bin/env node
"use strict";
require("make-promises-safe");

// Require Node.js Dependencies
const { strictEqual } = require("assert").strict;
const { join } = require("path");
const { promisify } = require("util");
const fs = require("fs");
const { spawnSync } = require("child_process");
const { readFile, existsSync } = fs;

// Require Third-party Dependencies
const { gray, green, bold, yellow, cyan, red, white } = require("kleur/colors");
const qoa = require("qoa");
const git = require("isomorphic-git");
git.plugins.set("fs", fs);

// Require Internal Dependencies
const { parseOutDatedDependencies, taggedString, findPkgKind } = require("../src/utils");
const { update, rollback } = require("../src/npm");
const questions = require("../src/questions.json");

// CONSTANTS
const CWD = process.cwd();
const SPAWN_OPTIONS = { cwd: CWD, env: process.env };
const EXEC_SUFFIX = process.platform === "win32";

// VARIABLES
const readFileAsync = promisify(readFile);
const gitTemplate = taggedString`chore: update ${"name"} (${"from"} to ${"to"})`;

/**
 * @async
 * @function main
 * @returns {Promise<void>}
 */
async function main() {
    if (!existsSync(join(CWD, "package.json"))) {
        console.log(red().bold(`\n > No package.json found on current working dir: ${yellow().bold(CWD)}\n`));
        process.exit(0);
    }

    // Read local package.json
    const havePackageLock = existsSync(join(CWD, "package-lock.json"));
    const localPackage = JSON.parse(
        await readFileAsync(join(CWD, "package.json"), { encoding: "utf8" })
    );

    console.log(`\n${gray().bold(" > npm outdated --json")}`);
    const { stdout } = spawnSync(`npm${EXEC_SUFFIX ? ".cmd" : ""}`, ["outdated", "--json"], SPAWN_OPTIONS);
    if (stdout.toString().trim().length === 0) {
        console.log("All dependancies are up-to-date");
        process.exit(0);
    }
    const outdated = parseOutDatedDependencies(stdout);

    // Define list of packages to update!
    const packageToUpdate = [];
    for (const pkg of outdated) {
        if (pkg.current === pkg.latest) {
            continue;
        }

        const updateTo = pkg.wanted === pkg.current ? pkg.latest : pkg.wanted;
        console.log(`\n${green().bold(pkg.name)} (${white().bold(pkg.current)} -> ${cyan().bold(updateTo)})`);
        const { update } = await qoa.confirm(questions.update_package);
        if (!update) {
            continue;
        }

        pkg.kind = findPkgKind(localPackage, pkg);
        pkg.updateTo = updateTo;

        if (pkg.wanted !== pkg.latest && pkg.current !== pkg.wanted) {
            console.log("");
            const wanted = `wanted (${green().bold(pkg.wanted)})`;
            const latest = `latest (${yellow().bold(pkg.latest)})`;

            const { release } = await qoa.interactive({
                type: "interactive",
                handle: "release",
                query: yellow().bold(`which release of ${white().bold(pkg.name)} do you want ?`),
                menu: [wanted, latest]
            });

            pkg.updateTo = release === wanted ? pkg.wanted : pkg.latest;
        }

        packageToUpdate.push(pkg);
    }

    // Exit if there is no package to update
    if (packageToUpdate.length === 0) {
        console.log(white().bold(`\nNo package to update.. ${red("exiting process")}`));
        process.exit(0);
    }

    // Configuration
    console.log(`\n${gray().bold("------------------------------------------- ")}\n`);
    const { runTest } = await qoa.confirm(questions.run_test);
    const { gitCommit } = await qoa.confirm(questions.git_commit);

    // Verify test and git on the local root/system
    console.log("");
    let stopScript = false;
    let gitUsername;
    let gitEmail;

    if (gitCommit) {
        const { stdout: username } = spawnSync("git", ["config", "--global", "user.name"], SPAWN_OPTIONS);
        gitUsername = username.toString().replace(/(\r\n|\n|\r)/gm, "");

        const { stdout: useremail } = spawnSync("git", ["config", "--global", "user.email"], SPAWN_OPTIONS);
        gitEmail = useremail.toString().replace(/(\r\n|\n|\r)/gm, "");
    }

    if (runTest) {
        const scripts = localPackage.scripts || {};
        if (Reflect.has(scripts, "test")) {
            console.log("✔️ npm test script must exist");
        }
        else {
            console.log("⛔️ Unable to found test script in local package.json");
            stopScript = true;
        }
    }
    if (stopScript) {
        console.log("");
        process.exit(0);
    }

    console.log(`\n${gray(" > Everything is okay ... Running update in one second.")}\n`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Run updates!
    for (const pkg of packageToUpdate) {
        console.log(`\nupdating ${bold(green(pkg.name))} (${yellow(pkg.current)} -> ${cyan(pkg.updateTo)})`);
        const { status, remove } = update(pkg);
        if (status !== 0) {
            console.log(red(`\n > Failed to update ${pkg.name} package!`));
            if (remove) {
                console.log(" > package has been removed, rollback installation");
                rollback(pkg, false);
            }
            continue;
        }

        if (runTest) {
            console.log(" > npm test");
            try {
                const { signal, status } = spawnSync(`npm${EXEC_SUFFIX ? ".cmd" : ""}`,
                    ["test"], { ...SPAWN_OPTIONS, stdio: "inherit" });
                strictEqual(signal, null);
                strictEqual(status, 0);
            }
            catch (error) {
                console.log(red("An Error occured while executing tests!"));
                console.log("Rollback to previous version!");
                rollback(pkg);

                continue;
            }
        }

        if (gitCommit) {
            const name = pkg.name.length > 40 ? `${pkg.name.substr(0, 37)}...` : pkg.name;
            const commitMsg = gitTemplate({ name, from: pkg.current, to: pkg.updateTo });
            console.log(` > git commit -m ${yellow(commitMsg)}`);

            await git.add({ dir: CWD, filepath: "package.json" });
            if (havePackageLock) {
                await git.add({ dir: CWD, filepath: "package-lock.json" });
            }
            await git.commit({ dir: CWD, message: commitMsg, author: { email: gitEmail, name: gitUsername } });
        }
    }

    console.log("\nAll packages updated !\n");
}
main().catch(console.error);
