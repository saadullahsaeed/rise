'use strict';

const fs = require('fs'),
      yaml = require('js-yaml'),
      path = require('path'),
      log = require('../utils/log'),
      readConfig = require('../utils/readConfig'),
      fsStat = require('../utils/fs').fsStat,
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports = function generateFunction(functionName) {
  const project = readConfig('nfx');
  let err;

  if (functionName.length < 3) {
    return 'Function name is too short.';
  }

  if (!functionName.match(/^[a-z0-9]+$/i)) {
    return 'Function name should be alphanumeric.';
  }

  err = createFolderIfNotExist('functions');
  if (err !== null) {
    return err;
  }

  const functionFolderPath = path.join('functions', functionName),
        functionPath = path.join(functionFolderPath, 'index.js'),
        basicIndexPath = path.join(__dirname, 'basic-index.js');

  err = createFolderIfNotExist(functionFolderPath);
  if (err !== null) {
    return err;
  }

  const content = fsReadFile(basicIndexPath),
        stat = fsStat(functionPath);

  if (!stat) {
    try {
      fs.writeFileSync(functionPath, content, 'utf8');
    } catch(e) {
      return `Could not create "${functionPath}" folder`;
    }
  } else {
    log.warn(`The file "${functionPath}" already exists`);
  }

  project.functions = project.functions || {};
  project.functions[functionName] = project.functions[functionName] || {};
  fs.writeFileSync('nfx.yaml', yaml.safeDump(project), 'utf8');

  return null;
};

function createFolderIfNotExist(folderPath) {
  const stat = fsStat(folderPath);
  if (!stat) {
    try {
      fs.mkdirSync(folderPath, 0o755);
    } catch(e) {
      return `Could not create "${folderPath}" folder`;
    }
  } else if (!stat.isDirectory()) {
    return `Could not create "${folderPath}" folder`;
  }

  return null;
}
