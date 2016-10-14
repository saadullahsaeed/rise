'use strict';

const fs         = require('fs'),
      path       = require('path'),
      log = require('../utils/log');

module.exports.uploadNFXFiles = function(nfx) {
  return new Promise((resolve, reject) => {
    nfx.state = 'SAVING';
    const uploadS3Promises = [];

    const nfxFiles = [{
      key: `versions/${nfx.version}/aws/cf.json`,
      body: JSON.stringify(nfx.cfTemplate, null, 2),
      contentType: 'application/json'
    }, {
      key: `versions/${nfx.version}/api.yaml`,
      body: fs.createReadStream('api.yaml'),
      contentType: 'text/yaml'
    }, {
      key: `versions/${nfx.version}/functions.yaml`,
      body: fs.createReadStream('functions.yaml'),
      contentType: 'text/yaml'
    }, {
      key: 'nfx.json',
      body: JSON.stringify(nfx.nfxJSON),
      contentType: 'application/json'
    }];

    for (let i = 0; i < nfxFiles.length; i++) {
      uploadS3Promises.push(
        uploadS3(nfx, nfxFiles[i].key, nfxFiles[i].body, nfxFiles[i].contentType)
      );
    }

    Promise.all(uploadS3Promises).then(() => {
      resolve(nfx);
    }, (err) => {
      reject(err);
    });
  });
}

function uploadS3(nfx, key, body, contentType) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: nfx.bucketName,
      Key: key,
      ACL: 'private',
      Body: body,
      ContentType: contentType
    };

    log.info(`Saving ${key} in S3...`);
    nfx.awsSDK.s3.upload(params, function(err, data) {
      if (err) {
        log.error(`Error on saving template ${err}`);
        reject(err);
      }

      log.info(`Successfully saved ${key}`);
      resolve();
    });
  });
}
