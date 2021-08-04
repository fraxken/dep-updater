#!/usr/bin/env node
/* eslint-disable no-sync */
"use strict";
require("make-promises-safe");

// Require Node.js Dependencies
const { strictEqual } = require("assert").strict;
const { join } = require("path");
const { spawnSync } = require("child_process");
const fs = require("fs");

// Require Third-party Dependencies
const { gray, green, bold, yellow, cyan, red, white, magenta, bgWhite, black } = require("kleur");
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
const gitTemplate = taggedString`chore: update ${"name"} (${"from"} to ${"to"})`;

async function main() {
    const [hasPackage, hasLock] = [
        fs.existsSync(join(CWD, "package.json")),
        fs.existsSync(join(CWD, "package-lock.json"))
    ];
    if (!hasPackage) {
        console.log(red().bold(`\n > No package.json found on current working dir: ${yellow().bold(CWD)}\n`));
        process.exit(0);
    }

    // Read local package.json
    const localPackage = JSON.parse(
        await fs.promises.readFile(join(CWD, "package.json"), { encoding: "utf8" })
    );
    const outdated = fetchOutdatedPackages();

    // Define list of packages to update!
    const packageToUpdate = [];
    for (const pkg of outdated) {
        if (pkg.current === pkg.latest) {
            continue;
        }

        const updateTo = pkg.wanted === pkg.current ? pkg.latest : pkg.wanted;
        console.log(`\n${green().bold(pkg.name)} (${cyan().bold(pkg.current)} -> ${yellow().bold(updateTo)})`);
        const { update } = await qoa.confirm(questions.update_package);
        if (!update) {
            continue;
        }

        pkg.kind = findPkgKind(localPackage, pkg);
        pkg.updateTo = updateTo;

        if (pkg.wanted !== pkg.latest && pkg.current !== pkg.wanted) {
            console.log("");
            const wanted = `wanted (${yellow().bold(pkg.wanted)})`;
            const latest = `latest (${red().bold(pkg.latest)}) ⚠️`;

            const { release } = await qoa.interactive({
                type: "interactive",
                handle: "release",
                query: white().bold("which release do you want ?"),
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
    console.log(`\n${gray().bold(" <---------------------------------------->")}\n`);
    const { runTest } = await qoa.confirm(questions.run_test);
    const { gitCommit } = await qoa.confirm(questions.git_commit);
    const { isDevDependencies } = gitCommit ? { isDevDependencies: false } : await qoa.confirm(questions.is_dev_dep);

    // Verify test and git on the local root/system
    console.log("");
    const author = gitCommit || isDevDependencies ? fetchGitUserInformations() : {};

    if (runTest) {
        const scripts = localPackage.scripts || {};
        if (Reflect.has(scripts, "test")) {
            console.log("✔️ npm test script must exist");
        }
        else {
            console.log("⛔️ Unable to found test script in local package.json");
            console.log("");
            process.exit(0);
        }
    }

    console.log(`${gray(" > Everything is okay ... ")}${magenta().bold("Running update in one second.")}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Run updates!
    for (const pkg of packageToUpdate) {
        console.log(gray("\n <---------------------------------------->\n"));
        console.log(`updating ${bold(green(pkg.name))} (${cyan(pkg.current)} -> ${yellow(pkg.updateTo)})`);
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
            catch {
                console.log(red("An Error occured while executing tests!"));
                console.log("Rollback to previous version!");
                rollback(pkg);

                continue;
            }
        }

        if (gitCommit) {
            const name = pkg.name.length > 40 ? `${pkg.name.substr(0, 37)}...` : pkg.name;
            const message = gitTemplate({ name, from: pkg.current, to: pkg.updateTo });
            console.log("");
            console.log(bgWhite(`${black().bold("commit:")} ${black(message)}`));

            await git.add({ dir: CWD, filepath: "package.json" });
            if (hasLock) {
                await git.add({ dir: CWD, filepath: "package-lock.json" });
            }
            await git.commit({ dir: CWD, message, author });
        }
    }

    if (isDevDependencies) {
        const message = "chore(package): update devDependencies";
        console.log("");
        console.log(bgWhite(`${black().bold("commit:")} ${black(message)}`));

        await git.add({ dir: CWD, filepath: "package.json" });
        if (hasLock) {
            await git.add({ dir: CWD, filepath: "package-lock.json" });
        }
        await git.commit({ dir: CWD, message, author });
    }

    console.log("");
    console.log("");
    console.log(green(" !!! -------------------------- !!!"));
    console.log(`${green(" > ✨ All packages updated ✨ <")}`);
    console.log(green(" !!! -------------------------- !!!"));
    console.log("");
}
main().catch(console.error);

function fetchOutdatedPackages() {
    console.log(`\n${gray().bold(" > npm outdated --json")}`);

    const { stdout } = spawnSync(`npm${EXEC_SUFFIX ? ".cmd" : ""}`, ["outdated", "--json"], SPAWN_OPTIONS);
    if (stdout.toString().trim().length === 0) {
        console.log("All dependancies are up-to-date");
        process.exit(0);
    }

    return parseOutDatedDependencies(stdout);
}

function fetchGitUserInformations() {
    const { stdout: nameStdout } = spawnSync("git", ["config", "--global", "user.name"], SPAWN_OPTIONS);
    const { stdout: emailStdout } = spawnSync("git", ["config", "--global", "user.email"], SPAWN_OPTIONS);

    const email = emailStdout.toString().replace(/(\r\n|\n|\r)/gm, "");
    const name = nameStdout.toString().replace(/(\r\n|\n|\r)/gm, "");

    return { email, name };
}
