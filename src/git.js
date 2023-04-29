
export function fetchGitUserInformations() {
  const { stdout: nameStdout } = spawnSync(
    "git",
    ["config", "--global", "user.name"],
    { cwd: process.cwd(), stdio: "inherit" }
  );
  const { stdout: emailStdout } = spawnSync(
    "git",
    ["config", "--global", "user.email"],
    { cwd: process.cwd(), stdio: "inherit" }
  );

  return {
    email: emailStdout.toString().replace(/(\r\n|\n|\r)/gm, ""),
    name: nameStdout.toString().replace(/(\r\n|\n|\r)/gm, "")
  };
}
