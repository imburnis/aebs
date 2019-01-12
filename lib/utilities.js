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
const url = require("url");
const https = require('https');
const decompresszip = require('decompress-zip');

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
			if(!fs.existsSync(dest))
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

//Function for downloading a file while folowing redirect links
//This function downloads an electron release zip from github
// it also follows redirect links so that it can download the final file
// (this is because the download links for github actually redirect to a different url for the download)
module.exports.DownloadFile = function (downloadUrl, dest) {
	console.log("Downloading " + downloadUrl);
	return new Promise((resolve, reject) => {
		//parse the downloadUrl to get the host and path
		var download = url.parse(downloadUrl);
		//Create the https request options
		var options = {
			//Set the host from the parsed URL
			host: download.host,
			port: 443,
			//Set the path from the parsed URL
			path: download.path,
			method: "GET",
			headers: {
				//The user-agent header needs to be set to something that describes the application
				// this is per the API
				"User-Agent": "Another Electron Build Script",
				"Accept": "application/octet-stream"
			}
		}

		//Create an https request with the options
		var request = https.get(options, function (response) {
			//If the status code is between 200 and 300, then it means that the file
			// was properly downloaded
			if (response.statusCode >= 200 && response.statusCode < 300) {
				//Create a writeStream to the destination file path
				var file = fs.createWriteStream(dest);
				//Get the byte length from the response content-length header
				var len = parseInt(response.headers['content-length'], 10);
				var downloaded = 0;

				//Add function callbacks to the response
				// data - function called when data is downloaded
				// end - function called when the file is finished downloading
				// error - function called when there is an error
				response.on('data', function (chunk) {
					//Write the chunk to the destination file
					file.write(chunk);
					//Add the length of the chunk to our stored downloaded bytes variable
					downloaded += chunk.length;
					//Clear the current line and output the current download progress
					process.stdout.clearLine();
					process.stdout.cursorTo(0);
					process.stdout.write("Downloading " + (100.0 * downloaded / len).toFixed(2) + "% " + downloaded + " bytes");
				}).on('end', function () {
					//Clear the current line and output 100% and the length of the file
					process.stdout.clearLine();
					process.stdout.cursorTo(0);
					process.stdout.write("Downloading " + (100.0).toFixed(2) + "% " + len + " bytes\r\n");

					//End and close the file writeStream
					file.end();
					file.close(resolve);
				}).on('error', function (err) {
					//End the file writeStream and call the promise reject function
					file.end();
					fs.unlinkSync(dest);
					reject(err);
				});
			} else if (response.headers.location) {
				//Else if the response headers have a location, the resolve by calling the DownloadFile function because the first request was a redirect
				resolve(module.exports.DownloadFile(response.headers.location, dest));
			} else {
				//Otherwise throw an exception with the response status code and status message
				reject(new Error(response.statusCode + ' ' + response.statusMessage));
			}
		});
	});
}

module.exports.UnZip = async function (zipPath, outputDir){
	//Unzip the release file to the build directory
	console.log("Unzipping " + zipPath + " to " + outputDir);
	return new Promise((resolve, reject) => {
		var count;
		//Create a decompress-zip instance
		var unzip = new decompresszip(zipPath);
		//Add an error callback to the unzip object
		unzip.on('error', function (err) {
			reject(err);
		});

		//Add an extract callback to the unzip object
		// this is called when decompression has completed
		unzip.on('extract', function (log) {
			//Clear the current line and output the total file count
			process.stdout.clearLine();
			process.stdout.cursorTo(0);
			process.stdout.write('Extracted file ' + count + ' of ' + count + "\r\n");
			resolve();
		});

		//Add a progress callback to the unzip object
		// this is called every time that a file is unzipped from the zip
		unzip.on('progress', function (fileIndex, fileCount) {
			//Update the current file count
			count = fileCount;
			//Clear the current line and output the progress of the decompression
			process.stdout.clearLine();
			process.stdout.cursorTo(0);
			process.stdout.write('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
		});

		//Call the extract function on the unzip object
		unzip.extract({
			//Set the path to be the final build directory
			path: outputDir,
			//Set the filter to ignore SymbolicLink
			filter: function (file) {
				return file.type !== "SymbolicLink";
			}
		});
	});
}