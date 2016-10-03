'use strict';

const fs = require('fs');

module.exports.fsReadFile = function(path) {
  try {
    return fs.readFileSync(path, { encoding: 'utf8' });
  } catch (err) {
    return false;
  }
}
