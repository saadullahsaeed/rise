'use strict';

const fs         = require('fs'),
      path       = require('path'),
      archiver   = require('archiver'),
      consoleLog = require('../utils/consoleLog').consoleLog;

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

        getActiveVersionHash(nfx).then((activeVersionHash) => {
          if (activeVersionHash === checksumHex) {
            // FIXME: delete temp zip file!!!
            reject("No change is present");
          } else {
            nfx.nfxJSON['active_version'] = nfx.version;
            nfx.nfxJSON['version_hashes'][`${nfx.version}`] = checksumHex;
            resolve(nfx);
          }
        }, (err) => reject(err));
      });
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

function getActiveVersionHash(nfx) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: nfx.bucketName,
      Key: 'nfx.json',
    };

    nfx.awsSDK.s3.getObject(params, function(err, data) {
      if (err) {
        if (err.message.indexOf('does not exist') > -1) {
          nfx.nfxJSON['version_hashes'] = {}
          resolve(null);
        } else {
          reject(err);
        }
      } else {
        nfx.nfxJSON = JSON.parse(data.Body);
        const activeVersionHash = nfx.nfxJSON['version_hashes'][nfx.nfxJSON['active_version']];
        resolve(activeVersionHash);
      }
    });
  });
}

