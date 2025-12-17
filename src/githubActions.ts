// Import Node.js Dependencies
import path from "node:path";
import fs from "node:fs";

// Import Third-party Dependencies
import { walkSync } from "@nodesecure/fs-walk";
import { request } from "undici";

// CONSTANTS
const kGitHubApiUrl = "https://api.github.com";
const kRequestOptions = {
  headers: {
    "X-GitHub-Api-Version": "2022-11-28",
    "user-agent": "dep-updater",
    authorization: `Bearer ${process.env.GITHUB_TOKEN}`
  }
} as const;
const kFetchedTags = new Map<string, any>();

export type WorkflowFileLine = (readonly [string, string[]])[];
export interface WorkflowFilesLinesOptions {
  workflowsPath?: string;
}

export function workflowsFilesLines(
  options: WorkflowFilesLinesOptions = {}
): WorkflowFileLine | [] {
  const {
    workflowsPath = ".github/workflows"
  } = options;

  const githubWorkflowPath = path.join(process.cwd(), workflowsPath);
  if (fs.existsSync(githubWorkflowPath) === false) {
    return [];
  }

  const workflowsFilesPath = [
    ...walkSync(githubWorkflowPath, {
      extensions: new Set([".yml"])
    })
  ];
  const workflowFilesLines = workflowsFilesPath.map(([, absolutePath]) => {
    const content = fs.readFileSync(absolutePath, "utf8");
    const lines = content.split(/\r?\n/);

    return [absolutePath, lines] as const;
  });

  return workflowFilesLines;
}

export interface OutdatedGithubAction {
  absolutePath: string;
  index: number;
  newLine: string;
}

export async function fetchOutdatedGitHubActions(
  workflowFilesLines: WorkflowFileLine = []
): Promise<OutdatedGithubAction[]> {
  if (workflowFilesLines.length === 0) {
    return [];
  }
  const outdated: OutdatedGithubAction[] = [];

  for (const [ga, usage] of parseGitHubActions(workflowFilesLines)) {
    // format foo/bar/baz -> foo/bar
    const repository = ga.split("/").slice(0, 2).join("/");
    const lastSha = await getLastTagSha(repository);
    if (lastSha === null) {
      continue;
    }
    const [name, sha] = lastSha;

    for (const { absolutePath, line, index } of usage) {
      const [, version] = line.split("@");
      const newLine = `${line.replace(version, sha)} # ${name}`;

      if (line === newLine) {
        continue;
      }

      outdated.push({
        absolutePath,
        index,
        newLine
      });
    }
  }

  return outdated;
}

async function getLastTagSha(
  repo: string
): Promise<null | [string, string]> {
  const requestUrl = new URL(`/repos/${repo}/tags`, kGitHubApiUrl);
  const { body, statusCode } = await request(
    requestUrl,
    {
      method: "GET",
      ...kRequestOptions
    }
  );
  const data = await body.json() as any[];
  if (statusCode !== 200) {
    return null;
  }
  kFetchedTags.set(repo, data);

  return [
    data[0].name,
    data[0].commit.sha
  ];
}

export interface GithubActionUsage {
  absolutePath: string;
  line: string;
  index: number;
  version: string;
  pinned: boolean;
}

function parseGitHubActions(
  workflowsFilesLines: WorkflowFileLine
): Map<string, GithubActionUsage[]> {
  const githubActions = new Map<string, GithubActionUsage[]>();

  for (const [absolutePath, lines] of workflowsFilesLines) {
    const linesWithGitHubAction = lines
      .map((line, index) => [line, index] as const)
      .filter(([line]) => {
        const withoutWhiteSpace = line.replace(/\s/g, "");

        return withoutWhiteSpace.startsWith("uses:") || withoutWhiteSpace.startsWith("-uses:");
      });

    for (const [line, index] of linesWithGitHubAction) {
      const [, gaWithVersion] = line.split(":");

      // remove possible comment ("foo/bar@baz # v3.3.3" -> "foo/bar@baz")
      const [ga, version] = gaWithVersion
        .replace(/\s/g, "")
        .replace("#", " #")
        .split(" ")[0]
        .split("@");

      const usage: GithubActionUsage = {
        absolutePath,
        line,
        index,
        version,
        pinned: isPinned(version)
      };

      if (githubActions.has(ga)) {
        const parsedGitHubActions = githubActions.get(ga)!;
        githubActions.set(ga, [...parsedGitHubActions, usage]);
      }
      else {
        githubActions.set(ga, [usage]);
      }
    }
  }

  return githubActions;
}

function isPinned(
  version: string
): boolean {
  if (!version.includes(".")) {
    // even if version does not contains a dot, it can be "v3" which is not a pinned version
    // length 10 make it safe
    return version.length > 10;
  }

  return false;
}
