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

	package.js
	Module for building an electron asar archive from a project

	Exports:	The function that builds the ASAR archive
\************************************************************************************/
const fs = require("fs");
const path = require("path");
const asar = require("asar");
const utilities = require("./utilities.js");
const Sassy = require("./sassy.js");

module.exports = async function(appDir, pckge){
	//Build the various folder paths that are needed
	var projectFolder = path.join(appDir, "src");
	var nodeModules = path.join(appDir, "node_modules");
	var build = path.join(appDir, "build");
	var asarFolder = path.join(appDir, "asar");

	//If the build directory doesnt exist, then create it
	if(!fs.existsSync(build)){
		fs.mkdirSync(build);
	}

	//If the temp asar folder for building doesnt exist, the create it
	// otherwise empty the directory
	if(!fs.existsSync(asarFolder)){
		fs.mkdirSync(asarFolder);
		console.log("Creating ASAR build folder!");
	}else{
		console.log("Cleaning ASAR build folder!");
		utilities.emptyFolderRecursiveSync(asarFolder);
	}

	//Create a node_modules folder in the asar app folder
	console.log("Grouping ASAR files.")
	fs.mkdirSync(path.join(asarFolder, "node_modules"));

	//Copy all of the dependencies listed in the package dependencies section
	console.log("Copying node dependencies...");
	//Loop over each of the dependencies
	for(var p in pckge.dependencies){
		//Copy that module from the source directory to the asar directory
		utilities.copyRecursiveSync(path.join(nodeModules, p), path.join(asarFolder, "node_modules", p));
	}

	console.log("Copying application logic...");
	//Copy all of the project logic (but ignore the scss folder)
	utilities.copyRecursiveSync(projectFolder, path.join(asarFolder, "src"), [
		path.join(projectFolder, "scss")
	]);

	//If the project has scss logic, then run the Sassy function to compile the most recent sass
	const scssFolder = path.join(projectFolder, "scss");
	if(fs.existsSync(scssFolder)){
		Sassy(appDir, path.join(asarFolder, "css"));
		console.log("Removing Sass from build");
	}

	//Copy the projects package.json to the asar directory
	console.log("Copying package.json");
	fs.linkSync(path.join(appDir, "package.json"), path.join(asarFolder, "package.json"));

	//Create the asar archive out of the asar folder
	console.log("Creating ASAR archive");
	await new Promise((resolve, reject) => {
		//Use the asar module to create the archive
		asar.createPackage(asarFolder, path.join(build, "app.asar"), function(){
			resolve();
		});
	});

	//Empty out the asar folder
	console.log("Cleaning ASAR temp folder.");
	utilities.emptyFolderRecursiveSync(asarFolder);
	//Remove the asar folder now that we are done
	fs.rmdirSync(asarFolder);
}