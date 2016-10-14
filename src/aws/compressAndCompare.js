'use strict';

const fs = require('fs'),
      path = require('path'),
      archiver = require('archiver'),
      titlecase = require('../utils/stringHelper'),
      log = require('../utils/log');

module.exports = function compressAndCompare(nfx) {
  const funcPaths = Object.keys(nfx.functions),
        compressPromises = [];

  for (let i = 0; i < funcPaths.length; ++i) {
    const funcPath = funcPaths[i];
    const funcName = titlecase(funcPath, path.sep);

    if (funcPath === 'default') {
      continue;
    }

    compressPromises.push(compress(nfx, funcPath, funcName));
  }

  const checksumPromises = [];
  checksumPromises.push(checksum(nfx.hasher, 'api.yaml'));
  checksumPromises.push(checksum(nfx.hasher, 'functions.yaml'));

  return Promise.all(compressPromises)
    .then(Promise.all(checksumPromises))
    .then(() => {
      nfx.hasher.end();
      const checksumHex = nfx.hasher.read().toString('hex'),
            activeVersion = nfx.nfxJSON.active_version,
            activeVersionHash = nfx.nfxJSON.version_hashes[nfx.nfxJSON.active_version];

      if (activeVersionHash === checksumHex) {
        for (let i = 0; i < nfx.compressedFunctions.length; ++i) {
          fs.unlinkSync(nfx.compressedFunctions[i].filePath);
        }
        return Promise.reject("No change is present");
      }

      if (!activeVersion) {
        log.info('Deploying the first version');
        nfx.version = 'v1';
      } else {
        nfx.previousVersion = activeVersion;
        nfx.version = `v${(parseInt(activeVersion.substr(1) || 0) + 1)}`;
        log.info(`Current active version is "${activeVersion}". Deploying "${nfx.version}"`);
      }

      nfx.nfxJSON.version_hashes[nfx.version] = checksumHex;

      return Promise.resolve(nfx);
    });
};

function compress(nfx, funcPath, funcName) {
  return new Promise((resolve/*, reject*/) => {
    log.info(`Compressing ${funcName}...`);

    const zipArchive = archiver.create('zip');
    const tempFileName = `/tmp/fn-${funcName}-${new Date().getTime()}.zip`;
    const output = fs.createWriteStream(tempFileName);

    output.on('close', () => {
      checksum(nfx.hasher, tempFileName).then(resolve).catch(log.error);
      log.info(`Compressed ${funcName}`);
    });

    nfx.compressedFunctions.push({
      functionName: funcName,
      filePath: tempFileName
    });

    zipArchive.pipe(output);
    zipArchive.bulk([
      { src: [ '**/*' ], cwd: funcPath, expand: true }
    ]);

    zipArchive.finalize();
  });
}

function checksum(hasher, file) {
  return new Promise((resolve/*, reject*/) => {
    log.info(`Calculating checksum of ${file}...`);

    const readStream = fs.createReadStream(file);
    readStream.once('end', resolve);
    readStream.pipe(hasher, { end: false });

    log.info(`Calculated checksum of ${file}`);
  });
}
