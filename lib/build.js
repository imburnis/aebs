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

	build.js
	This file is for building an electron application from a project path
	It allows the user to select the version and architecture of the output project
	based on the available downloads from the main electron Git repository

	If the cache parameter is used, then this will check the cache directory for the
	desired version and architecture before trying to download it from the github
	repository

	Exports:	The function for building a project with a passed in
				application directory. This is a user interactive function
\************************************************************************************/
const https = require('https');
const fs = require("fs");
const url = require("url");
const path = require("path");
const decompresszip = require('decompress-zip');
const PackageApp = require("./package.js");
const PostProcessWindows = require("./post-process-windows.js");
const PostProcessDarwin = require("./post-process-darwin.js");
const PostProcessLinux = require("./post-process-linux.js");
const utilities = require("./utilities.js");

module.exports = async function(appDir, cacheDir){
	//Perform some validation on the cacheDir parameter
	var useCache = false;
	if(cacheDir != undefined && cacheDir != null && cacheDir != "" && fs.existsSync(cacheDir)){
		useCache = true;
	}

	//Request all of the releases for electron from the github api
	var releases = await RequestReleases({
		host: "api.github.com",
		port: 443,
		path: "/repos/electron/electron/releases",
		method: "GET",
		headers: {
			"User-Agent": "Electron Release Downloader"
		}
	});

	//Get the users desired architecture and electron version
	var version = await UserRequestVersion(releases);
	var arch = await UserRequestArch(releases[version]);

	//Output some information to the console for the user
	console.log();
	console.log("Electron version: " + releases[version].tag_name);
	console.log("Electron architecture: " + releases[version].assets[arch].name);
	console.log();

	//Set the electronDownloadPath based on whether or not to use a cache directory
	var electronDownloadPath = "";
	if(useCache){
		electronDownloadPath = path.join(cacheDir, releases[version].assets[arch].name);
		console.log(electronDownloadPath);
	}else{
		electronDownloadPath = path.join(appDir, "build", releases[version].assets[arch].name);
		//If we are downloading to the build directory, make sure that hte build directory exists
		if (!fs.existsSync(path.join(appDir, "build"))){
			fs.mkdir(path.join(appDir, "build"));
		}
	}

	if (!fs.existsSync(path.dirname(electronDownloadPath))){
		throw new Error(`${path.dirname(electronDownloadPath)} does not exist!`);
	}

	//If the file to download doesn't exist then download it
	// otherwise, output that the file already exists
	if(!fs.existsSync(electronDownloadPath)){
		console.log("Downloading " + releases[version].assets[arch].url);
		await DownloadFile(releases[version].assets[arch].url, electronDownloadPath);
	}else{
		console.log("Already have " + releases[version].assets[arch].name + " in cache!")
	}

	console.log();

	//Get the contents of the application's package.json file
	console.log("Reading package.json from " + appDir + "\\package.json")
	var fileContents = await new Promise((resolve, reject) => {
		fs.readFile(path.join(appDir, "package.json"), (err, data) => {
			if(err){
				return reject(err);
			}
			return resolve(data);
		});
	});

	//Parse the JSON object
	var pckge = JSON.parse(fileContents);

	//Output that the package.json has been read properly
	console.log("Done!");

	//Package the application as an ASAR file (the way that electron stores application data)
	console.log("Beginning ASAR packaging...");
	await PackageApp(appDir, pckge);

	console.log("Beginning Electron App packaging...");
	//Get the architecture name by removing .zip from the file name
	var architecture = path.basename(releases[version].assets[arch].name, ".zip");
	//Finish packaging the full application
	var buildLocation = await PackageElectron(architecture, electronDownloadPath, appDir, pckge);

	//If we are not using the electron cache, then delete the downloaded zip file
	if(!useCache){
		console.log("Cleaning up electron download: " + electronDownloadPath);
		fs.unlinkSync(electronDownloadPath);
	}

	//Tell the user that we have finished building their application
	console.log("Build complete, application located at " + buildLocation);
}

//Displays all of the available versions of electron
// that can be built to. Separates the pre-releases from
// actual releases.
async function UserRequestVersion(releases){
	//Create a versions array to store the pre-releases vs the full releases
	var versions = [];
	versions[0] = [];
	versions[1] = [];

	//Storing the current length of the longest release and pre-release names
	var relLength = 8;
	var preLength = 12;

	//Go through each of the releases to find the longest name
	for(var i = 0; i < releases.length; i++){
		//Check if the current release is a prerelease, then use the pre-release variable
		// otherwise use the releases variable
		if(!releases[i].prerelease){
			//Push the current release name into the release array
			versions[0].push(releases[i].tag_name);
			//Compare the current release name length against the stored relLength
			if(releases[i].tag_name.length > relLength)
				relLength = releases[i].tag_name.length;
		}else{
			//Push the current release name into the pre-release array
			versions[1].push(releases[i].tag_name);
			//Compare the current release name length against the stored preLength
			if(releases[i].tag_name.length > preLength)
				preLength = releases[i].tag_name.length;
		}
	}

	//Sort both of the versions arrays in alphabetical order
	versions[0].sort();
	versions[1].sort();

	//Output the header of the versions table
	// -------------------------
	//| Releases | Pre-Releases |
	// -------------------------
	console.log(" ".padEnd(6 + relLength + preLength, "-") + " ");
	console.log("| " + "Releases".padEnd(relLength) + " | " + "Pre-Releases".padEnd(preLength) + " |");
	console.log("|".padEnd(6 + relLength + preLength, "-") + "|");

	//Go through each of the versions arrays and output the release and pre-release (if they exist)
	//| Release Name | Pre Release Name |
	var i = 0;
	while(i < versions[0].length || i < versions[1].length){
		console.log("| " + (versions[0][i] || "").padEnd(relLength) + " | " + (versions[1][i] || "").padEnd(preLength) + " |");
		i++;
	}
	//Output the bottom of the table
	//------------------------------
	console.log(" ".padEnd(6 + relLength + preLength, "-") + " ");

	//Ask the user which version number they want to use
	var version = await utilities.askQuestion("Enter the a number to use: ");
	var versionNum = -1;

	//Get the index of the release based on what the user entered
	for(var i = 0; i < releases.length; i++){
		if(releases[i].tag_name == version){
			versionNum = i;
			break;
		}
	}

	//If the index could not be found, then throw an exception
	if(versionNum == -1)
		throw new Error("No valid version number was selected!");

	return versionNum;
}

//Displays all of the architectures that are available for building to
// and prompts the user for which architecture to use
async function UserRequestArch(release){
	//Store all of the architecture names that we are actually going to output
	var versionNames = [];
	var maxLength = 12;

	//Go through each of the releases available and verify whether or not they are allowed to be output
	for(var i = 0; i < release.assets.length; i++){
		//Only output items that start with "electron-" and don't contain "-dsym", "-symbols", or "-pdb"
		if(release.assets[i].name.indexOf("electron-" + release.tag_name) == 0
			&& release.assets[i].name.indexOf("-dsym") == -1
			&& release.assets[i].name.indexOf("-symbols") == -1
			&& release.assets[i].name.indexOf("-pdb") == -1)
		{
			//Strip the architecture type from the release name and add it to the versionNames array
			var start = 10 + release.tag_name.length;
			var length = release.assets[i].name.length - 4 - start;
			versionNames.push(release.assets[i].name.substr(10 + release.tag_name.length, length));

			//Update the max length variable
			if(length > maxLength)
				maxLength = length;
		}
	}

	//Output the header of the architecture tables
	// ------------------
	//| # | Architecture |
	// ------------------
	console.log(" ".padEnd(maxLength + 9, "-") + " ");
	console.log("|  #  | Architecture".padEnd(maxLength) + " |");
	console.log("|".padEnd(maxLength + 9, "-") + "|");

	//Go through the architecture types and output the index and name
	//|  1  | darwin-x64   |
	//|  2  | linux-arm64  |
	//|  3  | linux-armv7l |
	//|  4  | linux-ia32   |
	//|  5  | linux-x64    |
	//|  6  | mas-x64      |
	//|  7  | win32-ia32   |
	//|  8  | win32-x64    |
	for(var i = 0; i < versionNames.length; i++){
		var number;
		if(i < 9)
			number = " " + (i + 1) + " ";
		else
			number = ((i + 1) + "").padEnd(3);

		console.log("| " + number + " | " + versionNames[i].padEnd(maxLength) + " |");
	}

	//Output the footer
	console.log(" ".padEnd(maxLength + 9, "-") + " ");

	//Ask the user which number architecture they want to use
	var arch = await utilities.askQuestion("Enter the architecture to use: ");

	//Construct the full architecture name
	// ex. electron-v3.0.7-win32-x64.zip
	var archName = "electron-" + release.tag_name + "-" + versionNames[arch - 1] + ".zip";
	archNum = -1;

	//Go through each of the assets and check if it matches the built archName
	for(var i = 0; i < release.assets.length; i++){
		if(release.assets[i].name == archName){
			archNum = i;
		}
	}

	//If the architecture wasn't found then throw an exception
	if(archNum == -1)
		throw new Error("No valid architecture has been selected");

	return archNum;
}

//This function downloads an electron release zip from github
// it also follows redirect links so that it can download the final file
// (this is because the download links for github actually redirect to a different url for the download)
function DownloadFile(downloadUrl, dest){
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
				"User-Agent": "Electron Release Downloader",
				"Accept": "application/octet-stream"
			}
		}

		//Create an https request with the options
		var request = https.get(options, function(response) {
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
				response.on('data', function(chunk){
					//Write the chunk to the destination file
					file.write(chunk);
					//Add the length of the chunk to our stored downloaded bytes variable
					downloaded += chunk.length;
					//Clear the current line and output the current download progress
					process.stdout.clearLine();
					process.stdout.cursorTo(0);
					process.stdout.write("Downloading " + (100.0 * downloaded / len).toFixed(2) + "% " + downloaded + " bytes");
				}).on('end', function(){
					//Clear the current line and output 100% and the length of the file
					process.stdout.clearLine();
					process.stdout.cursorTo(0);
					process.stdout.write("Downloading " + (100.0).toFixed(2) + "% " + len + " bytes\r\n");

					//End and close the file writeStream
					file.end();
					file.close(resolve);
				}).on('error', function(err){
					//End the file writeStream and call the promise reject function
					file.end();
					fs.unlinkSync(dest);
					reject(err);
				});
			} else if (response.headers.location) {
				//Else if the response headers have a location, the resolve by calling the DownloadFile function because the first request was a redirect
				resolve(DownloadFile(response.headers.location, dest));
			} else {
				//Otherwise throw an exception with the response status code and status message
				reject(new Error(response.statusCode + ' ' + response.statusMessage));
			}
		});
	});
}

//Function to request all of the releases from the electron git repository
function RequestReleases(options){
	return new Promise(resolve => {
		https.get(options, (resp) => {
			let data = '';

			// A chunk of data has been recieved.
			resp.on('data', (chunk) => {
				data += chunk;
			});

			// The whole response has been received. Print out the result.
			resp.on('end', () => {
				resolve(JSON.parse(data));
			});
		}).on("error", (err) => {
			console.log("Error: " + err.message);
		});
	});
}

//Package an electron application using a specified zip file of an electron build
// Requires that the architecture name be passed in (just so that folder and file names can be properly updated)
// and the path to the zip file of the repository release, the application directory to build from, and a
// javascript object that represents the application package.json file
async function PackageElectron(architecture, electronPath, appDir, pckge){
	var outputDir = path.join(appDir, "build", architecture);
	var asarPath = path.join(appDir, "build", "app.asar");

	//If an asar doesn't already exist, then throw an exception because the application can not be built
	if(!fs.existsSync(asarPath)){
		throw new Error("app.asar not found!");
	}

	//If the build directory (for the architecture) exists, then clean out the directory
	if(fs.existsSync(outputDir)){
		console.log("Clearing existing build directory!");
		utilities.emptyFolderRecursiveSync(outputDir);
	}

	//Unzip the release file to the build directory
	console.log("Unzipping " + architecture + ".zip to " + outputDir);
	await new Promise((resolve, reject) => {
		var count;
		//Create a decompress-zip instance
		var unzip = new decompresszip(electronPath);
		//Add an error callback to the unzip object
		unzip.on('error', function(err){
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
			path: path.join(appDir, "build", architecture),
			//Set the filter to ignore SymbolicLink
			filter: function (file) {
				return file.type !== "SymbolicLink";
			}
		});
	});

	//Check the architecture and call the appropriate post-processing function
	if(architecture.indexOf("win32") != -1){
		//WINDOWS
		console.log("Post processing Windows electron build...");
		await PostProcessWindows(pckge, asarPath, appDir, outputDir);
	}else if(architecture.indexOf("darwin") != -1 || architecture.indexOf("mas") != -1){
		//OSX
		console.log("Post processing OSX electron build...");
		await PostProcessDarwin(pckge, asarPath, appDir, outputDir);
	}else{
		//Linux
		console.log("Post processing Linux electron build...");
		await PostProcessLinux(pckge, asarPath, appDir, outputDir);
	}

	return outputDir
}