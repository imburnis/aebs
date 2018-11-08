#!/usr/bin/env node
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

	global.js
	Exposes all of the library functionality through command line arguments
\************************************************************************************/

const electronUtil = require("../lib/index.js");
//Used to parse the command line arguments
const commandLineArgs = require("command-line-args");
//Used to provide a help display for the command line utility
const commandLineUsage = require("command-line-usage");

//The main command line arguments section
// this is used to create verb like command line arguments similar to git
const mainDefinitions = [
	{name: "command", defaultOption: true}
];

//The specific arguments for the build command
const buildDefinitions = [
	{ name: "cache", alias: "c", type: String }
];

//A data driven command line help display
const helpSections = [{
	header: "Electron Utils",
	content: "A collection of utilities to support the lifecycle of an electron application"
},{
	header: "Verbs",
	content: [
		"build\t\tBuilds an electron project out of the current working directory",
		"clean\t\tCleans an electron project at the current working directory",
		"asar\t\tGenerates an asar from the current Electron project",
		"sassy\t\tSassifies the current electron project",
		"create\tCreates a template electron project",
		"help\t\tShow this help dialog"
	]
},{
	header: "Build Parameters",
	optionList: [
		{ name: "cache", alias: "c", description: "An optional path to cache electron builds at"}
	]
}];

//Set the process title to "Electron Utils"
process.title = "AEBS - Another Electron Build Script";

console.log("aebs  Copyright (C) 2018 Jacob Radatz");
console.log("This program comes with ABSOLUTELY NO WARRANTY.");
console.log("This is free software, and you are welcome to redistribute it");
console.log("under certain conditions.");

try{
	//Parse the first set of command line arguments
	const mainOptions = commandLineArgs(mainDefinitions, { stopAtFirstUnknown: true });
	//Store the remaining arguments in an array (if there are any)
	const argv = mainOptions._unknown || [];

	switch(mainOptions.command){
		case "build":
			//Parse the build command line arguments
			const buildOptions = commandLineArgs(buildDefinitions, { argv });
			//Call the build command in the Electron Utils Library
			electronUtil.Build(process.cwd(), buildOptions.cache);
		break;
		case "clean":
			//Call the clean command in the Electron Utils Library
			electronUtil.Clean(process.cwd());
		break;
		case "asar":
			//Call the asar command in the Electron Utils Library
			electronUtil.Asar(process.cwd());
		break;
		case "sassy":
			//Call the sassy command in the Electron Utils Library
			electronUtil.Sassy(process.cwd());
		break;
		case "create":
			//Call the create command in the Electron Utils Library
			electronUtil.Create(process.cwd());
		break;
		case "help":
		default:
			//If the verb was help or if the verb is not recognized print out the help text
			console.log(commandLineUsage(helpSections));
		break;
	}
}catch(e){
	console.log(e);
}