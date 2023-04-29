export const questions = {
  update_package: {
    type: "confirm",
    handle: "update",
    query: "Do you want to update this package ?",
    accept: "y"
  },
  run_test: {
    type: "confirm",
    handle: "runTest",
    accept: "y",
    query: "Do you want to run local npm test script after each update ?"
  },
  git_commit: {
    type: "confirm",
    handle: "gitCommit",
    accept: "y",
    query: "Do you want to commit after each package update ?"
  },
  is_dev_dep: {
    type: "confirm",
    handle: "isDevDependencies",
    accept: "y",
    query: "Do you want to commit all dependencies has devDependencies?"
  },
  git_template: {
    type: "confirm",
    handle: "useDefaultTemplate",
    accept: "y",
    query: "Do you want to use the default commit template ?"
  }
};
