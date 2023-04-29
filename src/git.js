// Import Node.js Dependencies
import { spawnSync } from "node:child_process";

export function fetchGitUserInformations() {
  const { stdout: nameStdout } = spawnSync(
    "git",
    ["config", "--global", "user.name"],
    { cwd: process.cwd() }
  );
  const { stdout: emailStdout } = spawnSync(
    "git",
    ["config", "--global", "user.email"],
    { cwd: process.cwd() }
  );

  return {
    email: emailStdout.toString().replace(/(\r\n|\n|\r)/gm, ""),
    name: nameStdout.toString().replace(/(\r\n|\n|\r)/gm, "")
  };
}
