export interface RawNpmOutdatedDependency {
  current: string;
  wanted: string;
  latest: string;
  location: string;
  dependent: string;
}

export interface NpmOutdatedDependency extends RawNpmOutdatedDependency {
  name: string;
  breaking: boolean;
  kind: "dependencies" | "devDependencies" | "optionalDependencies" | "peerDependencies";
  workspace?: {
    relativePath: string;
    absolutePath: string;
  };
  updateTo?: string;
}

export function* parseOutDatedDependencies(
  stdout: Buffer
): IterableIterator<NpmOutdatedDependency> {
  const result = JSON.parse(
    stdout.toString()
  ) as Record<string, RawNpmOutdatedDependency>;

  for (const [name, pkg] of Object.entries(result)) {
    yield {
      name,
      breaking: pkg.wanted !== pkg.latest,
      kind: "dependencies",
      ...pkg
    };
  }
}
