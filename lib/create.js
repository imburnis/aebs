/************************************************************************************\
 create.js
 File that houses the create project functionality of the utility

 Exports:	The function that is responsible for creating the project.
            This is a user interactive function.
\************************************************************************************/
const fs = require("fs");
const path = require("path");
const askQuestion = require("./utilities.js").askQuestion;
const replaceAll = require("./utilities.js").replaceAll;
const semver = require("semver");

module.exports = async function(rootDir){
	//If the root directory is not set, assume the current working directory
	if(rootDir == null || rootDir == undefined || rootDir == ""){
		rootDir = app.cwd();
	}

	//Get the name of the electronUtil console command from the package.json
	//This is so that the build scripts for the electron project can be properly initialized
	var electronUtilCommand = Object.getOwnPropertyNames(require("../package.json").bin)[0];

	//Create a default package.json object
	var packageJson = {
		name: "electron-base-project",
		productName: "Electron Base Project",
		version: "1.0.0",
		description: "",
		main: "src/index.js",
		scripts: {
			start: "electron .",
			build: electronUtilCommand + " build",
			clean: electronUtilCommand + " clean",
			asar: electronUtilCommand + " asar",
			sassy: electronUtilCommand + " sassy"
		},
		repository: {
			"type": "git",
			"url": ""
		},
		keywords: [],
		//Initialize the author based on the user running the process
		author: process.env.USERNAME,
		license: "MIT",
		config: {
			"company-name": "Company",
			"legal-copyright": "Copyright (C) " + (new Date()).getFullYear() + ", Company",
			icon: "./icon.png",
			identifier: "com.company.electronBaseProject"
		},
		dependencies: {},
		devDependencies: {
			electron: "^2.0.8"
		}
	};

	//Ask for the project name, but show the default
	var input = await askQuestion("Project Name(" + packageJson.productName + "): ");
	//If the user entered something, then update the productName, name, and config.identifier items based on the project name
	if(input != ""){
		packageJson.productName = input;
		//Replace all of the spaces with dashes for the project name
		packageJson.name = replaceAll(input.toLowerCase(), " ", "-");
		//Set the identifier to "com.companyNameLowerCase.projectNameLowercaseNoSpaces"
		packageJson.config.identifier = "com." + replaceAll(packageJson.config["company-name"].toLowerCase(), " ", "") + "." + replaceAll(packageJson.productName.toLowerCase(), " ", "");
	}

	//Ask the user for the initial package version, but ensure that it satisfies Semantic Versioning rules
	// https://semver.org/
	var validVersion = false;
	var parsedVersionString;
	while(!validVersion){
		//Ask the user for their version string
		input = await askQuestion("version (" + packageJson.version + "): ");
		//If they didnt enter anything, leave it as the default
		//Otherwise attempt to validate it with the semver module
		if(input == ""){
			parsedVersionString = "1.0.0";
			validVersion = true;
		}else{
			parsedVersionString = semver.valid(input);
			validVersion = parsedVersionString != null;
		}
	}

	//Ask the user for the project description
	packageJson.description = await askQuestion("description: ");

	//Ask the user for keywords for the project
	input = await askQuestion("keywords: ");
	//If they entered something, then set the project keywords to an array of what they entered
	// but split by commas
	if(input != ""){
		packageJson.keywords = input.split(",");
	}

	//Ask the user for a git repository url
	input = await askQuestion("git repository: ");
	//If the user didnt enter anything, delete the repository node
	// otherwise set the repo url node to what they entered
	if(input == ""){
		delete packageJson.repository;
	}else{
		packageJson.repository.url = input;
	}

	//Ask the user for the author name showing the default
	input = await askQuestion("author (" + packageJson.author + "): ");
	//If something was entered, then set the author attribute of the package
	if(input != ""){
		packageJson.author = input;
	}

	//Ask the user for the license that they want to use
	input = await askQuestion("license (" + packageJson.license + "): ");
	//If they entered something then set the license in the object
	if(input != ""){
		packageJson.license = input;
	}

	//Ask the user for the company name attribute (this is mostly used for the Windows executable information)
	input = await askQuestion("Company Name (" + packageJson.config["company-name"] + "): ");
	//If the user entered something, then populate the company name attribute
	if(input != ""){
		packageJson.config["company-name"] = input;
		//Update the config.identifier and config.legal-copyright attributes with the company name
		packageJson.config.identifier = "com." + replaceAll(packageJson.config["company-name"].toLowerCase(), " ", "") + "." + replaceAll(packageJson.productName.toLowerCase(), " ", "");
		packageJson.config["legal-copyright"] = "Copyright (C) " + (new Date()).getFullYear() + ", " + packageJson.config["company-name"];
	}

	//Ask the user if they want to use a cache directory for the electron downloads
	input = await askQuestion("Cache Directory for electron download (leaving empty will disable cache): ");
	//If the user entered something, then update the build command
	if(input != ""){
		packageJson.scripts.build = electronUtilCommand + " build --cache " + input;
	}

	console.log(JSON.stringify(packageJson, null, 4));
	console.log("About to create project with the above package.json.");
	input = await askQuestion("Continue? (yes):");
	input = input.toLowerCase();

	var createProject = false;
	if(input != ""){
		if(input == "yes" || input == "y"){
			createProject = true;
		}
	}else{
		createProject = true;
	}

	if(createProject){
		//Make a directory for the project using the package name
		fs.mkdirSync(path.join(rootDir, packageJson.name));

		//Create the source directory in the project
		fs.mkdirSync(path.join(rootDir, packageJson.name, "src"))

		//Write the package.json for the application
		fs.writeFileSync(path.join(rootDir, packageJson.name, "package.json"), JSON.stringify(packageJson, null, 4));
		//Copy the default gitignore file to the package directory
		fs.copyFileSync(path.join(__dirname, "..", "assets", "defaultGitignore.txt"),
			path.join(rootDir, packageJson.name, ".gitignore"));
		//Copy the default index.js file to the src directory
		fs.copyFileSync(path.join(__dirname, "..", "assets", "index.js"),
			path.join(rootDir, packageJson.name, "src", "index.js"));
		//Copy the default index.html file to the src directory
		fs.copyFileSync(path.join(__dirname, "..", "assets", "index.html"),
			path.join(rootDir, packageJson.name, "src", "index.html"));
		//Copy the default icon.png file to the package directory
		fs.copyFileSync(path.join(__dirname, "..", "assets", "icon.png"),
			path.join(rootDir, packageJson.name, "icon.png"));

		//Create a basic project structure
		fs.mkdirSync(path.join(rootDir, packageJson.name, "src", "scss"));
		fs.mkdirSync(path.join(rootDir, packageJson.name, "src", "css"));
		fs.mkdirSync(path.join(rootDir, packageJson.name, "src", "js"));
	}
}