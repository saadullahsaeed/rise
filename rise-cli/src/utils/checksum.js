'use strict';

const fs = require('fs'),
      glob = require('glob'),
      crypto = require('crypto'),
      log = require('../utils/log'),
      fsStat = require('../utils/fs').fsStat;

module.exports = function checksum(excludePattern) {
  const hasher = crypto.createHash('sha256'),
        options = {};

  if (typeof excludePattern === 'string') {
    options.ignore = excludePattern;
  }

  return new Promise((resolve, reject) => {
    log.info(`Calculating checksum...`);

    glob("**/*", options, function(err, files) {
      if (err) {
        reject(err);
      }

      let cp;
      for (let i = 0; i < files.length; ++i) {
        const file = files[i];
        if (fsStat(file).isDirectory()) {
          continue;
        }

        if (cp != null) {
          cp = cp.then(function(hasher) {
            return checksumFrom(hasher, file);
          });
        } else {
          cp = checksumFrom(hasher, file);
        }
      }

      cp.then(function(hasher) {
        log.info(`Calculated checksum.`);
        hasher.end();
        resolve(hasher.read().toString('hex'));
      }).catch(log.error);
    });
  });
};

function checksumFrom(hasher, file) {
  return new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
    const readStream = fs.createReadStream(file);
    readStream.pipe(hasher, { end: false });
    readStream.once('end', function() {
      resolve(hasher);
    });
  });
}
