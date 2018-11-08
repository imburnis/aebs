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

	utilities.js
	File for various utility functions for the build scripts

	Exports:	askQuestion - Prompts the command line for an answer
				replaceAll - Replace all occurances of something in a string
				copyRecursiveSync - Copy all files at a path to another path recursivly
				emptyFolderRecursiveSync - Empty the contents of a directory recursivly
				walk - recursivly go through a directory and find all of the files
				updateFileName - update the file name of a file but keep the extension
\************************************************************************************/
const readline = require("readline");
const fs = require("fs");
const path = require("path");

//Function to prompt the user for a response to a question using promises
module.exports.askQuestion = function(query) {
	//Create a readline interface
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

	//Return a promise that resolves with what the user enters
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

//Function to replace all instances of find with replace in str
module.exports.replaceAll = function(str, find, replace){
    //Call the first iteration of replace
	str = str.replace(find, replace);
	//While find is still in the string, call replace again
    while(str.indexOf(find) != -1){
        str = str.replace(find, replace);
    }
	//Return the cleared string
    return str;
}

//Function to copy all files under a directory to a different directory
//optionally allows ignoring certain directories
module.exports.copyRecursiveSync = function(src, dest, ignorePaths){
	//First check if the src item exists
	var exists = fs.existsSync(src);
	//If the src item exists, then get the stats of the item at the path
	var stats = exists && fs.statSync(src);
	//Check if the src path is a directory or not
	var isDirectory = exists && stats.isDirectory();
	//If the item exists and is a directory
	if (exists && isDirectory) {
		//If the current item is not in the array of ignore directories
		if(ignorePaths == undefined || ignorePaths.indexOf(path.normalize(src)) == -1){
			//Make a directory at the destination path
			fs.mkdirSync(dest);
			//call copyRecursiveSync with all of the child paths of the current folder
			fs.readdirSync(src).forEach(function(childItemName) {
				module.exports.copyRecursiveSync(path.join(src, childItemName),
				path.join(dest, childItemName), ignorePaths);
			});
		}
	} else {
		//Otherwise copy the file to the destination
		fs.linkSync(src, dest);
	}
};

//Function to delete all files under a specific folder path
module.exports.emptyFolderRecursiveSync = function(folderPath){
	//Make sure that the current folder path exists before attempting to empty it
	if (fs.existsSync(folderPath)) {
		//readdirsync is for mapping a function to every file/directory under the current path
		fs.readdirSync(folderPath).forEach(function(file, index){
			var curPath = path.join(folderPath, file);
			//Check if the current item is a directory or a file
			if (fs.lstatSync(curPath).isDirectory()) {
				//Recursivly empty the current directory
				module.exports.emptyFolderRecursiveSync(curPath);
				//Then remove the current directory
				fs.rmdirSync(curPath);
			} else {
				// delete file
				fs.unlinkSync(curPath);
			}
		});
	}
};

module.exports.walk = function(rootDir, offset) {
	return new Promise((resolve, reject) => {
		fs.readdir(path.join(rootDir,offset), (error, files) => {
			if (error) {
				return reject(error);
			}
			Promise.all(files.map((file) => {
				return new Promise((resolve, reject) => {
					const filepath = path.join(rootDir, offset, file);
					fs.stat(filepath, (error, stats) => {
						if (error) {
							return reject(error);
						}
						if (stats.isDirectory()) {
							module.exports.walk(rootDir, path.join(offset, file)).then(resolve);
						} else if (stats.isFile()){
							resolve(path.join(offset, file));
						}
					});
				});
			})).then((foldersContents) => {
				resolve(foldersContents.reduce((all, folderContents) => all.concat(folderContents), []));
			});
		});
	});
};

//Function for updating a file name (just the base name)
module.exports.updateFileName = function(filePath, newName){
	//Get the directory of the file path
	var dir = path.dirname(filePath);
	//Get the extension of the file path
	var ext = path.extname(filePath);

	//Return a promise that will rename the file to dir + newName + ext
	return new Promise((resolve, reject) => {
		//Use the fs module to rename the file, and path.join to construct
		// the new name so that this is os agnostic
		fs.rename(filePath, path.join(dir, newName + ext), (err) => {
			if(err){
				return reject(err);
			}
			return resolve();
		});
	});
}