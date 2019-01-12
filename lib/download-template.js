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

	download-template.js
    Adds ability to download a template from a github repo
    and adds it to the project directory

	Exports:
\************************************************************************************/

const fs = require("fs");
const path = require("path");
const utilities = require("./utilities.js");

//We are assuming that the template is coming from a git project
module.exports = async function(appDir, remoteTemplate){
    var tmpDir = path.join(appDir, "tmp");
    var tmpZip = path.join(tmpDir, "template.zip");
    var templateDir = path.join(tmpDir, "template");

    var sourceDir = path.join(appDir, "src");
    var packagePath = path.join(appDir, "package.json");

    fs.mkdirSync(tmpDir);

    await utilities.DownloadFile(remoteTemplate, tmpZip);

    await utilities.UnZip(tmpZip, templateDir);

    fs.unlinkSync(tmpZip);

    var templateProjectDir = await GetProjectDir(templateDir);
    var templateProjectPackage = path.join(templateProjectDir, "package.json");
    var templateProjectSrc = path.join(templateProjectDir, "src");

    utilities.emptyFolderRecursiveSync(sourceDir);

    //Update the project json with the dependancies from the template
    var projectPckge = require(packagePath);
    var templatePckge = require(templateProjectPackage);

    projectPckge.dependencies = {};
    for (var property in templatePckge.dependencies) {
        projectPckge.dependencies[property] = templatePckge.dependencies[property];
    }
    projectPckge.main = templatePckge.main;

    fs.writeFileSync(packagePath, JSON.stringify(projectPckge, null, 4));

    //Copy all of the data from the template into the src directory
    utilities.copyRecursiveSync(templateProjectSrc, sourceDir);

    //delete the temp folder
    utilities.emptyFolderRecursiveSync(tmpDir);
    fs.rmdirSync(tmpDir);
}

async function GetProjectDir(parent){
    return new Promise((resolve, reject) => {
        fs.readdir(parent, function(err, items){
            if(err)
                return reject(err);

            for(var i = 0; i < items.length; i++){
                var file = path.join(parent, items[i]);
                var stat = fs.statSync(file);

                if(stat.isDirectory()){
                    return resolve(file);
                }
            }
        });
    });
}