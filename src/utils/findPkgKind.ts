// Import Third-party Dependencies
import type { PackageJSON, WorkspacesPackageJSON } from "@nodesecure/npm-types";

// Import Internal Dependencies
import type {
  NpmOutdatedDependency
} from "./parseOutdatedDependencies.js";

export function findPkgKind(
  packageJSON: PackageJSON | WorkspacesPackageJSON,
  pkg: NpmOutdatedDependency
) {
  const dependencies = packageJSON.dependencies || {};
  if (Reflect.has(dependencies, pkg.name)) {
    return "dependencies";
  }

  const devDependencies = packageJSON.devDependencies || {};
  if (Reflect.has(devDependencies, pkg.name)) {
    return "devDependencies";
  }

  const optionalDependencies = packageJSON.optionalDependencies || {};
  if (Reflect.has(optionalDependencies, pkg.name)) {
    return "optionalDependencies";
  }

  const peerDependencies = packageJSON.peerDependencies || {};
  if (Reflect.has(peerDependencies, pkg.name)) {
    return "peerDependencies";
  }

  return "dependencies";
}
