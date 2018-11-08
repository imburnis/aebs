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

	post-process-linux.js
	Post processing that needs to be done on a linux application to fully customize it

	Exports:	The function that does the post processing
\************************************************************************************/
const fs = require("fs");
const path = require("path");
const utilities = require("./utilities.js");

module.exports = async function(pckge, sourceAsar, appDir, outDir){
	//Remove the default asar file
	var defaultAsar = path.join(outDir, "resources", "default_app.asar");
	if(fs.existsSync(defaultAsar)){
		console.log("Removing default electron application asar");
		fs.unlinkSync(defaultAsar);
	}

	//Copy the built application file to the application directory
	console.log("Moving application archive into electron application");
	fs.renameSync(sourceAsar, path.join(outDir, "resources", "app.asar"));

	console.log("Updating electron.exe properties to match package.json");

	//Update the file name of the application executable so that it is customized
	console.log("Renaming electron executable to " + pckge.productName);
	await utilities.updateFileName(path.join(outDir, "electron"), pckge.productName);
}