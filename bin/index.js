#!/usr/bin/env node

import "make-promises-safe";
import "dotenv/config";

// Import Node.js Dependencies
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import * as timers from "node:timers/promises";
import os from "node:os";

// Import Third-party Dependencies
import { confirm, select } from "@topcli/prompts";
import kleur from "kleur";
import git from "isomorphic-git";

const { gray, green, bold, yellow, cyan, red, white, magenta, bgWhite, black } = kleur;

// Import Internal Dependencies
import { taggedString, findPkgKind } from "../src/utils.js";
import { fetchOutdatedPackages, update, rollback } from "../src/npm.js";
import { fetchGitUserInformations } from "../src/git.js";
import { questions } from "../src/questions.js";
import { fromAsync } from "../src/array-from-async.js";
import * as GHA from "../src/githubActions.js";

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
const isWorkspace = "workspaces" in localPackage;
const hasTestScript = "test" in (localPackage.scripts ?? {});
const outdated = fetchOutdatedPackages(
  CWD,
  localPackage.workspaces ?? []
);

// Define list of packages to update!
const packageToUpdate = [];
for (const pkg of outdated) {
  if (pkg.current === pkg.latest) {
    continue;
  }

  const updateTo = pkg.wanted === pkg.current ? pkg.latest : pkg.wanted;
  const isWorkspacePkg = isWorkspace && pkg.workspace !== null;
  const workspaceName = isWorkspacePkg ?
    gray().bold(`[workspace: ${cyan(pkg.dependent)}] `) : "";

  console.log(
    `\n${workspaceName}${green().bold(pkg.name)} (${cyan().bold(pkg.current)} -> ${yellow().bold(updateTo)})`
  );
  const updatePackage = await confirm(questions.update_package);
  if (!updatePackage) {
    continue;
  }

  if (isWorkspacePkg) {
    const workspacePackage = JSON.parse(
      await fs.promises.readFile(
        path.join(pkg.workspaceSrc, "package.json"),
        { encoding: "utf8" }
      )
    );

    pkg.kind = findPkgKind(workspacePackage, pkg);
  }
  else {
    pkg.kind = findPkgKind(localPackage, pkg);
  }
  pkg.updateTo = updateTo;

  if (pkg.wanted !== pkg.latest && pkg.current !== pkg.wanted) {
    console.log("");
    const wanted = `wanted (${yellow().bold(pkg.wanted)})`;
    const latest = `latest (${red().bold(pkg.latest)}) ⚠️`;

    const release = await select(white().bold("Pick a release (minor or major)"), {
      choices: [wanted, latest]
    });

    pkg.updateTo = release === wanted ? pkg.wanted : pkg.latest;
  }

  packageToUpdate.push(pkg);
}

const workflowsFilesLines = GHA.workflowsFilesLines();
const githubActionsToUpdate = await fromAsync(GHA.fetchOutdatedGitHubActions(workflowsFilesLines));
const hasGithubActions = githubActionsToUpdate !== null;
const hasGHAUpdates = (githubActionsToUpdate ?? []).length > 0;
// Exit if there is no package & GHA to update
if (packageToUpdate.length === 0 && hasGHAUpdates === false) {
  exit(
    white().bold(`\nNo package or GHA to update.. ${red("exiting process")}`)
  );
}

// Configuration
console.log(`\n${gray().bold(" <---------------------------------------->")}\n`);
const runTest = hasTestScript ? await confirm(questions.run_test) : false;
const gitCommit = await confirm(questions.git_commit);
const isDevDependencies = gitCommit ? false : await confirm(questions.is_dev_dep);

// Verify test and git on the local root/system
console.log("");
const author = fetchGitUserInformations();

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

// GHA
console.log(`\n${gray().bold(" <---------------------------------------->")}\n`);
if (hasGHAUpdates === false) {
  if (hasGithubActions === false) {
    exit("No GitHub Actions found!");
  }

  exit("No GitHub Action to update!");
}

const updateGHAs = await confirm(questions.update_gha, { initial: true });
if (!updateGHAs) {
  exit();
}

const ghaCommit = await confirm(questions.gha_commit);
for (const update of githubActionsToUpdate) {
  const workflowLines = workflowsFilesLines.find(([absolutePath]) => absolutePath === update.absolutePath)[1];
  workflowLines[update.index] = update.newLine;

  fs.writeFileSync(update.absolutePath, workflowLines.join(os.EOL));
}

if (ghaCommit) {
  await git.add({ dir: CWD, filepath: ".github/workflows", fs });
  await git.commit({ dir: CWD, message: "chore: update GitHub Actions", author, fs });
}

console.log("\n\n" + green(" !!! -------------------------- !!!"));
console.log(`${green(" > ✨ All GitHub Actions updated ✨ <")}`);
console.log(green(" !!! -------------------------- !!!") + "\n");

async function commit(message) {
  await git.add({ dir: CWD, filepath: "package.json", fs });
  if (hasLock) {
    await git.add({ dir: CWD, filepath: "package-lock.json", fs });
  }
  await git.commit({ dir: CWD, message, author, fs });
}

function exit(message) {
  if (message) {
    console.log(message + "\n");
  }
  process.exit(0);
}
