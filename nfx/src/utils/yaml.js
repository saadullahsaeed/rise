'use strict';
const fs   = require('fs'),
      yaml = require('js-yaml');

module.exports.loadYAML = function(path) {
  try {
    const content = fs.readFileSync(path);
    return yaml.safeLoad(content);
  } catch (err) {
    return false;
  }
};
