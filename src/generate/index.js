"use strict";

const fs = require('fs'),
      yaml = require('js-yaml'),
      path = require('path'),
      log = require('../utils/log'),
      readConfig = require('../utils/readConfig'),
      fsStat = require('../utils/fs').fsStat,
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports = function(functionName) {
  const project = readConfig('nfx');

  if (functionName.length < 3) {
    log.error('Function name is too short.');
    process.exit(1);
  }

  if (!functionName.match(/^[a-z0-9]+$/i)) {
    log.error('Function name should be alphanumeric.');
    process.exit(1);
  }

  if (project.functions && project.functions.hasOwnProperty(functionName)) {
    log.error('The same name already exist in nfx.yaml.');
    process.exit(1);
  }

  createFolderIfNotExist('functions');
  const functionFolderPath = path.join('functions', functionName),
        functionPath = path.join(functionFolderPath, 'index.js'),
        basicIndexPath = path.join(__dirname, 'basic-index.js');

  createFolderIfNotExist(functionFolderPath);

  const content = fsReadFile(basicIndexPath),
        stat = fsStat(functionPath);

  if (!stat) {
    try {
      fs.writeFileSync(functionPath, content, 'utf8');
    } catch(e) {
      log.error(`Could not create "${functionPath}" folder`);
      process.exit(1);
    }
  } else {
    log.warn(`The file "${functionPath}" already exists`);
  }

  project.functions = project.functions || {};
  project.functions[functionName] = {};
  fs.writeFileSync('nfx.yaml', yaml.safeDump(project), 'utf8');
};

function createFolderIfNotExist(folderPath) {
  const stat = fsStat(folderPath);
  if (!stat) {
    try {
      fs.mkdirSync(folderPath, 0o755);
    } catch(e) {
      log.error(`Could not create "${folderPath}" folder`);
      process.exit(1);
    }
  } else if (!stat.isDirectory()) {
    log.error(`Could not create "${folderPath}" folder`);
    process.exit(1);
  }
}
