'use strict';

const fs         = require('fs'),
      path       = require('path'),
      archiver   = require('archiver'),
      AWS        = require('aws-sdk'),
      ConsoleLog = require('../utils/consoleLog').ConsoleLog;

module.exports.CompressAndUpload = function(functions, bucketName) {
  return new Promise((resolve, reject) => {
    const funcPaths = Object.keys(functions);
    const version = '0.0.2' // FIXME: hardcode it for now.
    const compressAndUploadPromises = []
    for ( var i = 0; i < funcPaths.length; ++i) {
      const funcPath = funcPaths[i];
      const funcName = funcPath.replace(path.sep, '');
      const func = functions[funcPath];

      if (funcPath === 'default') {
        continue;
      }

      compressAndUploadPromises.push(
        compressAndUpload(bucketName, version, funcPath, funcName, func)
      );
    }

    Promise.all(compressAndUploadPromises).then(() => {
      resolve(bucketName);
    }, (err) => {
      reject(err);
    });
  });
}

function compressAndUpload(bucketName, version, funcPath, funcName, func) {
  return new Promise((resolve, reject) => {
    ConsoleLog('info', `Uploading ${funcName} to bucket ${bucketName}`);

    // Compress files
    const zipArchive = archiver.create('zip');
    const tempFileName = '/tmp/fn-' + funcName + '-' + new Date().getTime() + '.zip';
    const output = new fs.createWriteStream(tempFileName);
    const s3Key = funcName + '-' + version + '.zip';

    output.on('close', function() {
      const s3 = new AWS.S3();
      const params = {
        Bucket: bucketName,
        Key: s3Key,
        ACL: 'private',
        Body: fs.createReadStream(tempFileName),
        ContentType: 'application/zip'
      };

      // Uplaod to S3
      s3.upload(params, function(err, data) {
        fs.unlinkSync(tempFileName);

        if (err) {
          ConsoleLog('err', `Error on uploading function ${err}`);
          reject(err);
        }

        ConsoleLog('info', `Successfully uploaded ${s3Key}`);
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
