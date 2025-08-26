// Import Node.js Dependencies
import { spawnSync } from "node:child_process";
import path from "node:path";

// Import Third-party Dependencies
import kleur from "kleur";
const { gray, green, bgBlue, yellow, white } = kleur;

// Import Internal Dependencies
import {
  parseOutDatedDependencies,
  type NpmOutdatedDependency
} from "./utils/index.js";

// CONSTANTS
const kSpawnOptions = {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  shell: true,
  encoding: "buffer"
} as const;
const kNpmCommand = `npm${process.platform === "win32" ? ".cmd" : ""}`;
const kNpmFlagKind = new Map([
  ["dependencies", "-P"],
  ["devDependencies", "-D"],
  ["optionalDependencies", "-O"],
  ["peerDependencies", "--save-peer"]
]);

export function fetchOutdatedPackages(
  location: string,
  workspaces: string[] = []
): NpmOutdatedDependency[] {
  console.log(`\n${gray().bold(" > npm outdated --json")}`);

  const { stdout } = spawnSync(kNpmCommand, ["outdated", "--json"], {
    cwd: process.cwd(),
    shell: true
  });

  if (stdout.toString().trim().length === 0) {
    console.log("All dependencies are up-to-date\n");
    process.exit(0);
  }

  return [...parseOutDatedDependencies(stdout)]
    .map((pkg) => {
      const foundWorkspace = workspaces.find(
        (workspace) => workspace.includes(pkg.dependent)
      );
      if (foundWorkspace) {
        pkg.workspace = {
          relativePath: foundWorkspace,
          absolutePath: path.join(location, foundWorkspace)
        };
      }

      return pkg;
    });
}

export interface UpdateResult {
  status: number | null;
  remove: boolean;
}

export function update(
  pkg
): UpdateResult {
  const kind = kNpmFlagKind.get(pkg.kind);
  const logArgs = `${kind}${pkg.workspace ? ` -w ${pkg.workspace.relativePath}` : ""}`;

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

export function rollback(
  pkg: NpmOutdatedDependency,
  remove = true
): void {
  const kind = kNpmFlagKind.get(pkg.kind)!;
  const logArgs = `${kind}${pkg.workspace ? ` -w ${pkg.workspace.relativePath}` : ""}`;

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

function buildNpmCommand(
  pkg: NpmOutdatedDependency,
  commandName: "install" | "remove"
): string[] {
  const kind = kNpmFlagKind.get(pkg.kind)!;

  const npmCommandArgs = [commandName, pkg.name, kind];
  if (pkg.workspace) {
    npmCommandArgs.push(`--workspace ${pkg.workspace.relativePath}`);
  }

  return npmCommandArgs;
}
