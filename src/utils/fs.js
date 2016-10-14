'use strict';

const fs = require('fs');

module.exports = {
  fsReadFile(path) {
    try {
      return fs.readFileSync(path, { encoding: 'utf8' });
    } catch (err) {
      return false;
    }
  },

  fsStat(path) {
    try {
      return fs.statSync(path);
    } catch (err) {
      return false;
    }
  }
};
