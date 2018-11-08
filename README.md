# AEBS - Another Electron Build Script
There are many packagers for Electron out there, and many of them have a very large development community. So why bother making another packaging tool?

Well, the answer to that is simple! I wanted something simple that I could expand as I need different functionality while I mess around with Electron.

## Usage
This utility is meant to be installed as a global node package so it can be run from the command line.

```shell
aebs [command] <options>
```

| Command | Functionality |
| ------- | ------------- |
| create  | Similar to the NPM Init command. This creates a new project and adds npm scripts for all of the build commands in this package. Also asks for some additional information for customizing the final electron builds |
| build   | Packages the electron application into an asar file, asks the user for which version/architecture to use, and customizes the final build |
| clean   | Empties the build directory |
| sassy   | Compiles any files in the scss folder under the src directory of the project to the css folder |
| asar    | Packages the electron application into a .asar file into the build directory |

With the build command, there is an option to specify a cache directory so that a zip file of the Electron release doesn't need to be redownloaded every time.
```shell
aebs create -c "/path/to/cache"
```

## Install Instructions
This package is currently available through the npm package manager.

```shell
npm -i aebs -g
```

## Creating a new Project
```shell
/parent/dir/of/new/project$:aebs create
<Answer Prompts>
/parent/dir/of/new/project$:cd ./project-name
/parent/dir/of/new/project$:npm install
/parent/dir/of/new/project$:npm run start
```

## Note
If using the sass (any .scss files in the sass directory) you _must_ have sass installed globally so you can run sass from the command line.