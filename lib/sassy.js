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

	sassy.js
	Compiles all scss files into css files for an electron project
	Only runs on files located within src/scss and compiles them to the outputPath

	Requires that sass be installed globally in the build environment

	Exports:	The function that sassifies the project
\************************************************************************************/
const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const utilities = require("./utilities.js");

//Called to compile all scss files in a project
module.exports = async function(appDir, outputPath){
	console.log("Checking if application is sassy");
	var projectFolder = path.join(appDir,"src");
	console.log("Using project directory: " + projectFolder);
	if(!outputPath){
		outputPath = path.join(projectFolder, "css");
	}

	//If the scss folder exists in the project, the walk the directory looking for scss files
	if(fs.existsSync(path.join(projectFolder, "scss"))){
		var files = await utilities.walk(path.join(projectFolder, "scss"), "");
		//Use Promise.all to process all of the files
		await Promise.all(files.map((file) =>{
			return new Promise((resolve, reject) => {
				//If the file does not start with "_" and the extension is .scss, then launch a child process to compile the scss file
				if(path.basename(file).indexOf("_") != 0 && path.extname(file) == ".scss"){
					child_process.exec(`sass "${path.join(projectFolder, "scss", file)}" "${path.join(outputPath, path.basename(file, ".scss") + ".css")}"`, function(err, stdout, stderr){
						if(err){
							return reject(err);
						}
						return resolve();
					});
				}
			});
		}));
		console.log("The application has been sassified!");
	}else{
		console.log("Application is not Sassy!");
	}
}