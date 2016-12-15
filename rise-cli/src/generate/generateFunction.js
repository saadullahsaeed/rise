'use strict';

const fs = require('fs'),
      path = require('path'),
      log = require('../utils/log'),
      config = require('../utils/manageConfig'),
      fsStat = require('../utils/fs').fsStat,
      indexTemplate = `'use strict';

exports.handle = (req, res, next) => {
  res.send({status: 'ok'});
  next();
};`;

module.exports = function generateFunction(functionName) {
  const project = config.read('rise'),
        routes = config.read('routes');

  if (functionName.length < 3) {
    return 'Function name is too short.';
  }

  if (!functionName.match(/^[a-z0-9]+$/i)) {
    return 'Function name should be alphanumeric.';
  }

  let err;
  err = createFolderIfNotExist('functions');
  if (err !== null) {
    return err;
  }

  const functionFolderPath = path.join('functions', functionName),
        functionPath = path.join(functionFolderPath, 'index.js');

  err = createFolderIfNotExist(functionFolderPath);
  if (err !== null) {
    return err;
  }

  const stat = fsStat(functionPath);

  if (!stat) {
    try {
      fs.writeFileSync(functionPath, indexTemplate, 'utf8');
    } catch(e) {
      return `Could not create "${functionPath}" folder`;
    }
  } else {
    log.warn(`The file "${functionPath}" already exists`);
  }

  project.functions = project.functions || {};
  project.functions[functionName] = project.functions[functionName] || {};
  config.write('rise', project);

  routes.paths[`/${functionName}`] = routes.paths[`/${functionName}`] || {
    get: {
      'x-rise': {
        'function': functionName
      }
    }
  };
  config.write('routes', routes);

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
