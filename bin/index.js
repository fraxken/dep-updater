#!/usr/bin/env node

import "make-promises-safe";

// Import Node.js Dependencies
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import * as timers from "node:timers/promises";

// Import Third-party Dependencies
import kleur from "kleur";
import qoa from "qoa";
import git from "isomorphic-git";

const { gray, green, bold, yellow, cyan, red, white, magenta, bgWhite, black } = kleur;

// Import Internal Dependencies
import { taggedString, findPkgKind } from "../src/utils.js";
import { fetchOutdatedPackages, update, rollback } from "../src/npm.js";
import { fetchGitUserInformations } from "../src/git.js";
import { questions } from "../src/questions.js";

// CONSTANTS
const CWD = process.cwd();
const kSpawnOptions = { cwd: CWD, env: process.env };
const kNpmCommand = `npm${process.platform === "win32" ? ".cmd" : ""}`;
const kGitTemplate = taggedString`chore: update ${"name"} (${"from"} to ${"to"})`;

const [hasPackage, hasLock] = [
  fs.existsSync(path.join(CWD, "package.json")),
  fs.existsSync(path.join(CWD, "package-lock.json"))
];
if (!hasPackage) {
  exit(
    red().bold(`\n > No package.json found on current working dir: ${yellow().bold(CWD)}`)
  );
}

// Read local package.json
const localPackage = JSON.parse(
  await fs.promises.readFile(path.join(CWD, "package.json"), { encoding: "utf8" })
);
const hasTestScript = "test" in (localPackage.scripts ?? {});
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
  exit(
    white().bold(`\nNo package to update.. ${red("exiting process")}`)
  );
}

// Configuration
console.log(`\n${gray().bold(" <---------------------------------------->")}\n`);
const { runTest } = hasTestScript ? await qoa.confirm(questions.run_test) : { runTest: false };
const { gitCommit } = await qoa.confirm(questions.git_commit);
const { isDevDependencies } = gitCommit ? { isDevDependencies: false } : await qoa.confirm(questions.is_dev_dep);

// Verify test and git on the local root/system
console.log("");
const author = gitCommit || isDevDependencies ? fetchGitUserInformations() : {};

console.log(`${gray(" > Everything is okay ... ")}${magenta().bold("Running update in one second.")}`);
await timers.setTimeout(1_000);

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
      const { signal, status } = spawnSync(kNpmCommand,
        ["test"], { ...kSpawnOptions, stdio: "inherit" });
      assert.equal(signal, null);
      assert.equal(status, 0);
    }
    catch {
      console.log(red("An Error occured while executing tests!"));
      console.log("Rollback to previous version!");
      rollback(pkg);

      continue;
    }
  }

  if (gitCommit) {
    const name = pkg.name.length > 40 ? `${pkg.name.slice(0, 37)}...` : pkg.name;
    const message = kGitTemplate({ name, from: pkg.current, to: pkg.updateTo });
    console.log("");
    console.log(bgWhite(`${black().bold("commit:")} ${black(message)}`));

    await commit(message);
  }
}

if (isDevDependencies) {
  const message = "chore(package): update devDependencies";
  console.log("");
  console.log(bgWhite(`${black().bold("commit:")} ${black(message)}`));

  await commit(message);
}

console.log("\n\n" + green(" !!! -------------------------- !!!"));
console.log(`${green(" > ✨ All packages updated ✨ <")}`);
console.log(green(" !!! -------------------------- !!!") + "\n");

async function commit(message) {
  await git.add({ dir: CWD, filepath: "package.json", fs });
  if (hasLock) {
    await git.add({ dir: CWD, filepath: "package-lock.json", fs });
  }
  await git.commit({ dir: CWD, message, author, fs });
}

function exit(message) {
  console.log(message + "\n");
  process.exit(0);
}
