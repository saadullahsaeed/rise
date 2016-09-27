'use strict';
const fs   = require('fs'),
      YAML = require('js-yaml');

module.exports.LoadYAML = function(path) {
  try {
    const content = fs.readFileSync(path);
    return YAML.safeLoad(content);
  } catch (err) {
    return false;
  }
}
