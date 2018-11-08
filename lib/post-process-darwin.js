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

	post-process-darwin.js
	Post processing that needs to be done on a darwin application to fully customize it

	Exports:	The function that does the post processing
\************************************************************************************/
const fs = require("fs");
const path = require("path");
const png2icons = require("png2icons");
const plist = require("plist");

//array of all of the helpers that need to be customized
const helpers = [
	"Electron Helper EH.app",
	"Electron Helper NP.app",
	"Electron Helper.app"
];

//Function that does the post processing on the built application to customize it
module.exports = async function(pckge, sourceAsar, appDir, outDir){
	//Remove the default application file that electron releases with the binaries
	var defaultAsarPath = path.join(outDir, "Electron.app", "Contents", "Resources", "default_app.asar");
	if(fs.existsSync(defaultAsarPath)){
		console.log("Removing default electron application asar");
		fs.unlinkSync(defaultAsarPath);
	}

	//Move source ASAR file to the application directory
	console.log("Moving application archive into electron application");
	var buildAsarPath = path.join(outDir, "Electron.app", "Contents", "Resources", "app.asar");
	fs.renameSync(sourceAsar, buildAsarPath);

	//Check the package for the icon path to see if it exists
	var iconPath = undefined;
	var iconName = pckge.name + ".icns";
	if(pckge.config.icon){
		//If the icon is an absolute path, then just use the iconPath
		// otherwise use the path module to resolve the relative path with the appDir
		if(path.isAbsolute(pckge.config.icon)){
			iconPath = pckge.config.icon;
		}else{
			iconPath = path.resolve(path.join(appDir, pckge.config.icon));
		}
	}

	//As long as the iconPath has been set, then create the mac icns
	if(iconPath != undefined){
		console.log("Creating OSX icon for electron build");
		//Read the input icon into a variable
		var inputIcon = fs.readFileSync(iconPath);
		//use the png2icons module to create the OSX icon
		var output = png2icons.createICNS(inputIcon, png2icons.BEZIER, 0);
		//If there was no error, then write the icon out to the project directory
		if(output){
			console.log("Writing icns file to application resources");
			//Write the file into the application
			fs.writeFileSync(path.join(outDir, "Electron.app", "Contents", "Resources", iconName), output);
			console.log("Removing existing electron icns file");
			//Delete the default electron icon
			fs.unlinkSync(path.join(outDir, "Electron.app", "Contents", "Resources", "electron.icns"));
		}else{
			//Otherwise throw an exception
			throw new Error("Unable to convert icon to icns!");
		}
	}

	//Go through each of the helper applications in the electron
	// application and apply customization
	console.log("Processing Electron Helper applications...");
	for(var i = 0; i < helpers.length; i++){
		//Construct the helper path
		var helperPath = path.join(outDir, "Electron.app", "Contents", "Frameworks", helpers[i]);

		//Process the helper plist file
		ProcessHelperPlist(helpers[i], pckge.productName, path.join(helperPath, "Contents", "Info.plist"));

		//Rename the helper folders so that they are customized
		fs.renameSync(path.join(helperPath, "Contents", "MacOS", helpers[i].substring(0, helpers[i].length - 4)), path.join(helperPath, "Contents", "MacOS", helpers[i].replace("Electron", pckge.productName.replace(" ", ""))));
		fs.renameSync(helperPath, path.join(outDir, "Electron.app", "Contents", "Frameworks", helpers[i].replace("Electron", pckge.productName)));
	}

	//Now apply customization to the main electron application
	console.log("Processing main Electron application");
	//Read the plist file from the application
	var mainPlist = plist.parse(fs.readFileSync(path.join(outDir, "Electron.app", "Contents", "Info.plist"), "utf8"));
	//Update CFBundleDisplayName to the product name
	mainPlist.CFBundleDisplayName = pckge.productName;
	//Update CFBundleExecutable to the productName but without space
	mainPlist.CFBundleExecutable = pckge.productName.replace(" ", "");
	//If there was an icon, then update CFBundleIconFile, otherwise leave it the same
	mainPlist.CFBundleIconFile = iconName || mainPlist.CFBundleIconFile;
	//If there is an identifier in the package, then update CFBundleIdentifier
	mainPlist.CFBundleIdentifier = pckge.config.identifier || mainPlist.CFBundleIdentifier;
	//Update CFBundleName to the Product Name without spaces
	mainPlist.CFBundleName = pckge.productName.replace(" ", "");
	//Set CFBundleShortVersionString to be the package version
	mainPlist.CFBundleShortVersionString = pckge.version;
	//Set CFBundleVersion to be the package version
	mainPlist.CFBundleVersion = pckge.version;

	//Remove the default plist file and write out the modified version
	fs.unlinkSync(path.join(outDir, "Electron.app", "Contents", "Info.plist"));
	fs.writeFileSync(path.join(outDir, "Electron.app", "Contents", "Info.plist"), plist.build(mainPlist));

	//Rename the executable file within the appdir
	fs.renameSync(path.join(outDir, "Electron.app", "Contents", "MacOS", "Electron"), path.join(outDir, "Electron.app", "Contents", "MacOS", pckge.productName.replace(" ", "")));
	//Rename the .app folder
	console.log("Renaming Electron.app to " + pckge.productName + ".app");
	fs.renameSync(path.join(outDir, "Electron.app"), path.join(outDir, pckge.productName + ".app"));
}

//Function that processes the helper plist files
// takes in the helper name, the product name for customization, and the path to the helper plist
function ProcessHelperPlist(helperName, productName, plistPath){
	//Use the plist module to parse the helper plist
	var helperPlist = plist.parse(fs.readFileSync(plistPath, "utf8"));
	//Set the CFBundleDisplayName to the helper name with the productName instead of "Electron"
	helperPlist.CFBundleDisplayName = helperName.replace("Electron", productName);
	//Set the CFBundleExecutable to the helper name with the productName instead of "Electron"
	helperPlist.CFBundleExecutable = helperName.replace("Electron", productName.replace(" ", ""));
	//If the package has an identifier attribute, the update the CFBundleIdentifier tag in the plist
	if(pckge.config.identifier){
		helperPlist.CFBundleIdentifier = pckge.config.identifier + "." + helperName.substring(9, helperName.length - 4).toLowerCase().replace(" ", ".");
	}

	//Delete the existing plist
	fs.unlinkSync(plistPath);
	//Write out the new plist using the fs module and the built plist
	fs.writeFileSync(plistPath, plist.build(helperPlist));
}