/************************************************************************************\
 	aebs
    Copyright (C) 2018 Jacob Radatz

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.

	index.js
	Main file for the module that exposes all
	of the functionality for the library.

	Exports:	Build(applicationDirectory, optional electronCacheDirectory)
					Builds an electron project from the passed in working directory
				Clean(applicationDirectory)
					Emptys the "Build" directory of an electron project
				Asar(applicationDirectory)
					Generate an asar for an electron application from the passed in path
				Sassy(applicationDirectory)
					Build any SCSS files into their css files for an electron application
					in the passed in path
				Create(rootDirectory)
					Create a project as a sub folder of the passed in root directory
\************************************************************************************/
const fs = require("fs");
const path = require("path");
const BuildProject = require("./build.js");
const PackageApp = require("./package.js");
const Sassy = require("./sassy.js");
const CreateProject = require("./create.js");
const utilities = require("./utilities.js");

//Add the build command to the module exports
exports.Build = BuildProject;

//Add the clean command to the module exports
exports.Clean = function(appDir){
	console.log("Emptying the current build directory");
	utilities.emptyFolderRecursiveSync(path.join(appDir, "build"));
};

//Add the asar command to the module exports
exports.Asar = async function(appDir){
	var packagePath = path.join(appDir, "package.json");
	console.log("Reading package.json from " + packagePath)
	var fileContents = await new Promise((resolve, reject) => {
		fs.readFile(packagePath, (err, data) => {
			if(err){
				return reject(err);
			}
			return resolve(data);
		});
	});

	var pckge = JSON.parse(fileContents);
	await PackageApp(appDir, pckge);
};

//Add the sassy command to the module exports
exports.Sassy = async function(appDir){
	await Sassy(appDir);
};

//Add the create project command to the module exports
exports.Create = CreateProject;