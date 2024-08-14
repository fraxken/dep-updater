// Import Node.js Dependencies
import { spawnSync } from "node:child_process";
import path from "node:path";

// Import Third-party Package
import kleur from "kleur";
const { gray, green, bgBlue, yellow, white } = kleur;

// Import Internal Dependencies
import { parseOutDatedDependencies } from "./utils.js";

// CONSTANTS
const kSpawnOptions = { cwd: process.cwd(), env: process.env, stdio: "inherit", shell: true };
const kNpmCommand = `npm${process.platform === "win32" ? ".cmd" : ""}`;
const kNpmFlagKind = new Map([
  ["Dependencies", "-P"],
  ["DevDependencies", "-D"],
  ["OptDependencies", "-O"],
  ["PeerDependencies", "--save-peer"]
]);

/**
 * @param {!string} location
 * @param {!string[]} workspaces
 */
export function fetchOutdatedPackages(
  location,
  workspaces
) {
  console.log(`\n${gray().bold(" > npm outdated --json")}`);

  const { stdout } = spawnSync(kNpmCommand, ["outdated", "--json"], {
    cwd: process.cwd(),
    shell: true
  });

  if (stdout.toString().trim().length === 0) {
    console.log("All dependencies are up-to-date\n");
    process.exit(0);
  }

  return parseOutDatedDependencies(stdout)
    .map((pkg) => {
      const foundWorkspace = workspaces.find(
        (workspace) => workspace.includes(pkg.dependent)
      );
      if (foundWorkspace) {
        pkg.workspaceSrc = path.join(location, foundWorkspace);
        pkg.workspace = foundWorkspace;
      }
      else {
        pkg.workspace = null;
      }

      return pkg;
    });
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
  const logArgs = `${kind}${pkg.workspace ? ` -w ${pkg.workspace}` : ""}`;

  console.log("");
  console.log(
    bgBlue(yellow().bold(`> npm remove ${white(pkg.name)} ${logArgs}`))
  );
  console.log("");
  {
    const npmCommandArgs = buildNpmCommand(pkg, "remove");
    const { status } = spawnSync(kNpmCommand, npmCommandArgs, kSpawnOptions);

    if (status !== 0) {
      return { status, remove: false };
    }
  }

  const completePackageName = `${pkg.name}@${pkg.updateTo}`;
  console.log("");
  console.log(
    bgBlue(yellow().bold(`> npm install ${white(completePackageName)} ${logArgs}`))
  );
  console.log("");

  const npmCommandArgs = buildNpmCommand(pkg, "install");
  const { status } = spawnSync(kNpmCommand, npmCommandArgs, kSpawnOptions);

  return { status, remove: true };
}

/**
 * @function rollback
 * @description Rollback package installation
 * @memberof npm#
 * @param {Depup.Dependencies} pkg package to install
 * @param {boolean} [remove=true] choose to remove first the package
 * @returns {void}
 */
export function rollback(
  pkg,
  remove = true
) {
  const kind = kNpmFlagKind.get(pkg.kind);
  const logArgs = `${kind}${pkg.workspace ? ` -w ${pkg.workspace}` : ""}`;

  if (remove) {
    console.log(` > npm remove ${green(pkg.name)} ${logArgs}`);

    const npmCommandArgs = buildNpmCommand(pkg, "remove");
    spawnSync(kNpmCommand, npmCommandArgs, kSpawnOptions);
  }

  const completePackageName = `${pkg.name}@${pkg.current}`;
  console.log(` > npm install ${green(completePackageName)} ${logArgs}`);

  const npmCommandArgs = buildNpmCommand(pkg, "install");
  spawnSync(kNpmCommand, npmCommandArgs, kSpawnOptions);
}

function buildNpmCommand(pkg, commandName) {
  const kind = kNpmFlagKind.get(pkg.kind);

  const npmCommandArgs = [commandName, pkg.name, kind];
  if (pkg.workspace) {
    npmCommandArgs.push(`--workspace ${pkg.workspace}`);
  }

  return npmCommandArgs;
}
