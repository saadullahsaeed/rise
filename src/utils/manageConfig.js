'use strict';

const fs = require('fs'),
      fsReadFile = require('../utils/fs').fsReadFile,
      fsStat = require('../utils/fs').fsStat,
      log = require('./log'),
      yaml = require('js-yaml');

module.exports = {
  read(file) {
    const extension = getExtension(file);

    if (extension === null) {
      log.error(`Unknown file ${file}.`);
      process.exit(1);
    }

    const fileName = `${file}${extension}`,
          content = fsReadFile(fileName);

    switch(extension) {
      case '.yaml':
      case '.yml':
        try {
          return yaml.safeLoad(content);
        } catch (err) {
          log.error(`Invalid ${fileName}.`);
          process.exit(1);
        }
        break;
      case '.json':
      case '.js':
        try {
          return JSON.parse(content);
        } catch (err) {
          log.error(`Invalid ${fileName}.`);
          process.exit(1);
        }
        break;
    }
  },

  write(name, content) {
    const extension = getExtension(name);

    if (extension === null) {
      log.error(`Unknown file ${name}.`);
      process.exit(1);
    }

    const fileName = `${name}${extension}`;
    switch(extension) {
      case '.yaml':
      case '.yml':
        fs.writeFileSync(fileName, yaml.safeDump(content), { encoding: 'utf8' });
        break;
      case '.json':
      case '.js':
        fs.writeFileSync(fileName, JSON.stringify(content), { encoding: 'utf8' });
        break;
    }
  }
};

function getExtension(name) {
  const extensions = ['.yaml', '.yml', '.json', '.js'];
  for (let i = 0; i < extensions.length; i++) {
    const stat = fsStat(`${name}${extensions[i]}`);
    if (stat) {
      return extensions[i];
    }
  }

  return null;
}
