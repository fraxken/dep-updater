// Import Node.js Dependencies
import path from "node:path";
import fs from "node:fs";

// Import Third-party Dependencies
import { walkSync } from "@nodesecure/fs-walk";
import { request, Headers } from "@myunisoft/httpie";

// CONSTANTS
const kGitHubApiUrl = "https://api.github.com";
const kRequestOptions = {
  headers: new Headers({
    "X-GitHub-Api-Version": "2022-11-28",
    "user-agent": "dep-updater"
  }),
  authorization: process.env.GITHUB_TOKEN
};
const kFetchedTags = new Map();

export function workflowsFilesLines(options = {}) {
  const {
    workflowsPath = ".github/workflows"
  } = options;

  const githubWorkflowPath = path.join(process.cwd(), workflowsPath);
  if (fs.existsSync(githubWorkflowPath) === false) {
    return null;
  }

  const workflowsFilesPath = [
    ...walkSync(githubWorkflowPath, {
      extensions: new Set([".yml"])
    })
  ];
  const workflowFilesLines = workflowsFilesPath.map(([, absolutePath]) => {
    const content = fs.readFileSync(absolutePath, "utf8");
    const lines = content.split(/\r?\n/);

    return [absolutePath, lines];
  });

  return workflowFilesLines;
}

export async function* fetchOutdatedGitHubActions(workflowFilesLines) {
  const projectGitHubActions = parseGitHubActions(workflowFilesLines);
  if (projectGitHubActions.size === 0) {
    return;
  }

  for (const [ga, usage] of projectGitHubActions) {
    // format foo/bar/baz -> foo/bar
    const repository = ga.split("/").slice(0, 2).join("/");
    const [name, sha] = await getLastTagSha(repository);

    for (const { absolutePath, line, index, version: usageVersion, pinned } of usage) {
      const [, version] = line.split("@");
      const newLine = `${line.replace(version, sha)} # ${name}`;

      if (line === newLine) {
        continue;
      }

      yield {
        absolutePath,
        index,
        newLine
      };
    }
  }
}

async function getLastTagSha(repo) {
  const requestUrl = new URL(`/repos/${repo}/tags`, kGitHubApiUrl);
  const { data } = await request("GET", requestUrl, kRequestOptions);

  kFetchedTags.set(repo, data);

  return [data[0].name, data[0].commit.sha];
}

function parseGitHubActions(workflowsFilesLines) {
  const githubActions = new Map();

  if ((workflowsFilesLines ?? []).length === 0) {
    return githubActions;
  }

  for (const [absolutePath, lines] of workflowsFilesLines) {
    const linesWithGitHubAction = lines
      .map((line, index) => [line, index])
      .filter(([line]) => {
        const withoutWhiteSpace = line.replace(/\s/g, "");

        return withoutWhiteSpace.startsWith("uses:") || withoutWhiteSpace.startsWith("-uses:");
      });

    for (const [line, index] of linesWithGitHubAction) {
      const [, gaWithVersion] = line.split(":");
      // remove possible comment ("foo/bar@baz # v3.3.3" -> "foo/bar@baz")
      const [ga, version] = gaWithVersion.replace(/\s/g, "").replace("#", " #").split(" ")[0].split("@");
      const usage = { absolutePath, line, index, version, pinned: isPinned(version) };

      if (githubActions.has(ga)) {
        const parsedGitHubActions = githubActions.get(ga);
        githubActions.set(ga, [...parsedGitHubActions, usage].flat());

        continue;
      }

      githubActions.set(ga, [usage]);
    }
  }

  return githubActions;
}

function isPinned(version) {
  if (!version.includes(".")) {
    // even if version does not contains a dot, it can be "v3" which is not a pinned version
    // length 10 make it safe
    return version.length > 10;
  }

  return false;
}
