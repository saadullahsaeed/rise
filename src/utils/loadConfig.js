'use strict';

const fsReadFile = require('../utils/fs').fsReadFile,
      consoleLog = require('./consoleLog').consoleLog,
      yaml       = require('js-yaml');

module.exports.loadConfig = function(file) {
  let fileName, content, extension;
  const extensions = ['.yaml', '.yml', '.json', '.js'];
  for (let i = 0; i < extensions.length; i++) {
    content = fsReadFile(`${file}${extensions[i]}`);
    if (content) {
      extension = extensions[i];
      fileName = `${file}${extensions[i]}`;
      break;
    }
  }

  switch(extension) {
    case '.yaml':
    case '.yml':
      try {
        return yaml.safeLoad(content);
      } catch (err) {
        consoleLog('err', `Invalid ${fileName}.`);
        process.exit(1);
      }
      break;
    case '.json':
    case '.js':
      try {
        return JSON.parse(content);
      } catch (err) {
        consoleLog('err', `Invalid ${fileName}.`);
        process.exit(1);
      }
      break;
    default:
      consoleLog('err', `Unknown file ${file}.`);
      process.exit(1);
      break;
  }
}
