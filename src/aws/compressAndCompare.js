'use strict';

const fs           = require('fs'),
      path         = require('path'),
      archiver     = require('archiver'),
      fetchVersion = require('../aws/fetchVersion').fetchVersion,
      consoleLog   = require('../utils/consoleLog').consoleLog;

module.exports.compressAndCompare = function(nfx) {
  return new Promise((resolve, reject) => {
    const funcPaths = Object.keys(nfx.functions);
    const compressPromises = []
    for (let i = 0; i < funcPaths.length; ++i) {
      const funcPath = funcPaths[i];
      const funcName = funcPath.replace(path.sep, '');

      if (funcPath === 'default') {
        continue;
      }

      compressPromises.push(compress(nfx, funcPath, funcName));
    }

    const checksumPromises = [];
    checksumPromises.push(checksum(nfx, 'api.yaml'));
    checksumPromises.push(checksum(nfx, 'functions.yaml'));

    Promise.all(compressPromises).then(() => {
      Promise.all(checksumPromises).then(() => {
        nfx.hasher.end();
        const checksumHex = nfx.hasher.read().toString('hex');

        fetchVersion(nfx).then((updatedNFX) => {
          const activeVersion = updatedNFX.nfxJSON.active_version;
          const activeVersionHash = updatedNFX.nfxJSON.version_hashes[nfx.nfxJSON.active_version];

          if (activeVersion == undefined) {
            updatedNFX.version = 'v1';
            consoleLog('info', `Deploying the first version`);
          } else {
            updatedNFX.previousVersion = activeVersion;
            updatedNFX.version = `v${(parseInt(activeVersion.substr(1) || 0) + 1)}`;
            consoleLog('info', `Current active version is "${activeVersion}". Deploying "${nfx.version}"`);
          }

          if (activeVersionHash === checksumHex) {
            // FIXME: delete temp zip file!!!
            reject("No change is present");
          } else {
            nfx.nfxJSON.version_hashes[nfx.version] = checksumHex;
            resolve(nfx);
          }
        }).catch ( (err) => {
          reject(err)
        });
      })
      .catch( (err) => {
        reject(err);
      });
    })
    .catch( (err) => {
      reject(err);
    });
  });
}

function compress(nfx, funcPath, funcName) {
  return new Promise((resolve, reject) => {
    consoleLog('info', `Compressing ${funcName}...`);

    const zipArchive = archiver.create('zip');
    const tempFileName = `/tmp/fn-${funcName}-${new Date().getTime()}.zip`;
    const output = fs.createWriteStream(tempFileName);

    output.on('close', function() {
      checksum(nfx, tempFileName).then(resolve);
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

function checksum(nfx, file) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(file);
    readStream.once('end', resolve);
    readStream.pipe(nfx.hasher, { end: false });
  });
}
