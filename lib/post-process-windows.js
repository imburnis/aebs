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

	post-process-windows.js
	Post processing that needs to be done on a windows application to fully customize it

	Exports:	The function that does the post processing
\************************************************************************************/
const fs = require("fs");
const rcedit = require("rcedit");
const path = require("path");
const png2icons = require("png2icons");
const utilities = require("./utilities.js");

//Function that post processes the application for windows platforms
module.exports = async function(pckge, sourceAsar, appDir, outDir){
	//If a default app asar file exists then delete it
	if(fs.existsSync(path.join(outDir, "resources", "default_app.asar"))){
		console.log("Removing default electron application asar");
		fs.unlinkSync(path.join(outDir, "resources", "default_app.asar"));
	}

	//Move the application asar into the resources directory of the application
	console.log("Moving application archive into electron application");
	fs.renameSync(sourceAsar, path.join(outDir, "resources", "app.asar"));

	//Check the package file to see if there is an icon
	var iconPath = undefined;
	if(pckge.config.icon){
		//If the path is absolute, then use the direct file
		//Otherwise, resolve the relative path
		if(path.isAbsolute(pckge.config.icon)){
			iconPath = pckge.config.icon;
		}else{
			iconPath = path.resolve(path.join(appDir, pckge.config.icon));
		}
	}

	//If the iconpath has been set, then create the windows ico file
	if(iconPath != undefined){
		console.log("Creating icon for electron build");
		//Read the icon file into the inputIcon variable
		var inputIcon = fs.readFileSync(iconPath);
		//Use the png2icons module to create a windows ICO from the inputfile
		var output = png2icons.createICO(inputIcon, png2icons.BEZIER, 0, true);
		//If there was no errors, then write the file out to a temporary location in the build directory
		if(output){
			console.log("Writing icon file to temporary location");
			fs.writeFileSync(path.join(appDir, "build", "icon.ico"), output);
		}else{
			throw new Error("Unable to convert icon to ico!");
		}
	}

	//Use rcedit to update the exe information
	//set the CompanyName, FileDescription, LegalCopyright
	// ProductName, FileVersion, ProductVersion, and icon using data in the package
	console.log("Updating electron.exe properties to match package.json");
	await UpdateExeInformation(path.join(outDir, "electron.exe"), {
		"version-string": {
			"CompanyName": pckge.config["company-name"],
			"FileDescription":pckge.description,
			"LegalCopyright":pckge.config["legal-copyright"],
			"ProductName":pckge.productName
		},
		"file-version": pckge.version,
		"product-version": pckge.version,
		"icon": (iconPath == undefined) ? undefined : path.join(appDir, "build", "icon.ico")
	});

	//Rename the windows executable to the product name attribute in the package
	console.log("Renaming electron.exe to " + pckge.productName + ".exe");
	await utilities.updateFileName(path.join(outDir, "electron.exe"), pckge.productName);

	//Delete the windows icon file it one was generated
	console.log("Cleaning up...");
	if(iconPath){
		fs.unlinkSync(path.join(appDir, "build", "icon.ico"));
	}
}

//Wrapper around the rcedit module that does extra processing on the icon value
// and returns a promise
function UpdateExeInformation(exePath, options){
	//If the options.icon value is null or undefined then delete
	// it to make sure that rcedit doesnt try and wipe out the icon
	if(options.icon == undefined || options.icon == null){
		delete options.icon;
	}

	//Create a promise out of the rcedit call and return that
	return new Promise((resolve, reject) => {
		rcedit(exePath, options, (err) => {
			if(err){
				return reject(err);
			}
			return resolve(err);
		});
	});
}