'use strict';

const fs         = require('fs'),
      path       = require('path'),
      archiver   = require('archiver'),
      consoleLog = require('../utils/consoleLog').consoleLog;

module.exports.uploadFunctions = function(nfx) {
  return new Promise((resolve, reject) => {
    const uploadPromises = [];
    for (let i = 0; i < nfx.compressedFunctions.length; ++i) {
      const compressFunction = nfx.compressedFunctions[i];
      uploadPromises.push(
        upload(nfx, compressFunction)
      );
    }

    Promise.all(uploadPromises).then(() => {
      resolve(nfx);
    }, (err) => {
      reject(err);
    });
  });
}

function upload(nfx, compressFunction) {
  return new Promise((resolve, reject) => {
    const funcName = compressFunction.functionName;
    consoleLog('info', `Uploading ${funcName} to bucket ${nfx.bucketName}...`);

    const s3Key = `versions/${nfx.version}/functions/${funcName}.zip`;
    const params = {
      Bucket: nfx.bucketName,
      Key: s3Key,
      ACL: 'private',
      Body: fs.createReadStream(compressFunction.filePath),
      ContentType: 'application/zip'
    };

    nfx.awsSDK.s3.upload(params, function(err, data) {
      fs.unlinkSync(compressFunction.filePath);

      if (err) {
        consoleLog('err', `Error on uploading function ${err}`);
        reject(err);
      }

      consoleLog('info', `Successfully uploaded ${s3Key}`);
      resolve();
    });
  });
}
