'use strict';

const fs         = require('fs'),
      path       = require('path'),
      archiver   = require('archiver'),
      consoleLog = require('../utils/consoleLog').consoleLog;

module.exports.compressAndUpload = function(nfx) {
  return new Promise((resolve, reject) => {
    const funcPaths = Object.keys(nfx.functions);
    const compressAndUploadPromises = []
    for (let i = 0; i < funcPaths.length; ++i) {
      const funcPath = funcPaths[i];
      const funcName = funcPath.replace(path.sep, '');
      const func = nfx.functions[funcPath];

      if (funcPath === 'default') {
        continue;
      }

      compressAndUploadPromises.push(
        compressAndUpload(nfx, funcPath, funcName, func)
      );
    }

    Promise.all(compressAndUploadPromises).then(() => {
      resolve(nfx);
    }, (err) => {
      reject(err);
    });
  });
}

function compressAndUpload(nfx, funcPath, funcName, func) {
  return new Promise((resolve, reject) => {
    consoleLog('info', `Uploading ${funcName} to bucket ${nfx.bucketName}`);

    // Compress files
    const zipArchive = archiver.create('zip');
    const tempFileName = `/tmp/fn-${funcName}-${new Date().getTime()}.zip`;
    const output = new fs.createWriteStream(tempFileName);
    const s3Key = `versions/${nfx.version}/functions/${funcName}.zip`;

    output.on('close', function() {
      // nfx.hasher ends at uploadNFXFiles
      fs.createReadStream(tempFileName).pipe(nfx.hasher, { end: false });

      const params = {
        Bucket: nfx.bucketName,
        Key: s3Key,
        ACL: 'private',
        Body: fs.createReadStream(tempFileName),
        ContentType: 'application/zip'
      };

      // Uplaod to S3
      nfx.awsSDK.s3.upload(params, function(err, data) {
        fs.unlinkSync(tempFileName);

        if (err) {
          consoleLog('err', `Error on uploading function ${err}`);
          reject(err);
        }

        consoleLog('info', `Successfully uploaded ${s3Key}`);
        resolve();
      });
    });

    zipArchive.pipe(output);
    zipArchive.bulk([
      { src: [ '**/*' ], cwd: funcPath, expand: true }
    ]);
    zipArchive.finalize();
  });
}
