// Import Node.js Dependencies
import { spawnSync } from "node:child_process";

// Import Third-party Package
import kleur from "kleur";
const { gray, green, bgBlue, yellow, white } = kleur;

// Import Internal Dependencies
import { parseOutDatedDependencies } from "./utils.js";

// CONSTANTS
const kSpawnOptions = { cwd: process.cwd(), env: process.env, stdio: "inherit" };
const kNpmCommand = `npm${process.platform === "win32" ? ".cmd" : ""}`;
const kNpmFlagKind = new Map([
  ["Dependencies", "-P"],
  ["DevDependencies", "-D"],
  ["OptDependencies", "-O"]
]);

export function fetchOutdatedPackages() {
  console.log(`\n${gray().bold(" > npm outdated --json")}`);

  const { stdout } = spawnSync(kNpmCommand, ["outdated", "--json"], {
    cwd: process.cwd()
  });
  if (stdout.toString().trim().length === 0) {
    console.log("All dependencies are up-to-date\n");
    process.exit(0);
  }

  return parseOutDatedDependencies(stdout);
}

/**
 * @function update
 * @description update a given package
 * @memberof npm#
 * @param {Depup.Dependencies} pkg package to install
 * @returns {object}
 */
export function update(pkg) {
  const kind = kNpmFlagKind.get(pkg.kind);

  // if (pkg.updateTo === pkg.wanted) {
  //     console.log(` > npm update ${green(pkg.name)} ${kind}`);
  //     const { status } = spawnSync(kNpmCommand, ["update", pkg.name, kind], SPAWN_OPTIONS);

  //     return { status, remove: false };
  // }

  console.log("");
  console.log(bgBlue(yellow().bold(`> npm remove ${white(pkg.name)} ${kind}`)));
  console.log("");
  const { status } = spawnSync(kNpmCommand, ["remove", pkg.name, kind], kSpawnOptions);
  if (status !== 0) {
    return { status, remove: false };
  }

  const completePackageName = `${pkg.name}@${pkg.updateTo}`;
  console.log("");
  console.log(bgBlue(yellow().bold(`> npm install ${white(completePackageName)} ${kind}`)));
  console.log("");

  const { status: statusBis } = spawnSync(kNpmCommand, ["install", completePackageName, kind], kSpawnOptions);

  return { status: statusBis, remove: true };
}

/**
 * @function rollback
 * @description Rollback package installation
 * @memberof npm#
 * @param {Depup.Dependencies} pkg package to install
 * @param {boolean} [remove=true] choose to remove first the package
 * @returns {void}
 */
export function rollback(pkg, remove = true) {
  const kind = kNpmFlagKind.get(pkg.kind);

  if (remove) {
    console.log(` > npm remove ${green(pkg.name)} ${kind}`);
    spawnSync(kNpmCommand, ["remove", pkg.name, kind], kSpawnOptions);
  }

  const completePackageName = `${pkg.name}@${pkg.current}`;
  console.log(` > npm install ${green(completePackageName)} ${kind}`);
  spawnSync(kNpmCommand, ["install", completePackageName, kind], kSpawnOptions);
}
