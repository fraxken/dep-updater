# dep-updater
![version](https://img.shields.io/badge/dynamic/json.svg?url=https://raw.githubusercontent.com/fraxken/dep-updater/master/package.json&query=$.version&label=Version)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/fraxken/dep-updater/commit-activity)
![MIT](https://img.shields.io/github/license/mashape/apistatus.svg)

npm Dependencies Updater.

<p align="center">
    <img src="https://i.imgur.com/TaMxOrT.png" height="450">
</p>

## Features

- Upgrade package for you (even for breaking release).
- Run test after each upgrade (and rollback if test fail).
- Create a git commit for each update

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm install dep-updater -g
# or
$ npx dep-updater
```

## Usage example
When installed globally the `depup` executable will be exposed in your terminal

```bash
$ cd yourProject
$ depup
```

> [!WARNING]
> Be sure to only run the binary when you have no unstaged modification in your package.json
