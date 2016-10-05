'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog;

module.exports.uploadNFXFiles = function(nfx) {
  return new Promise((resolve, reject) => {
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
    }];

    for (let i = 0; i < nfxFiles.length; i++) {
      uploadS3Promises.push(
        uploadS3(nfx, nfxFiles[i].key, nfxFiles[i].body, nfxFiles[i].contentType)
      );
    }

    uploadS3Promises.push(updateNFXJSON(nfx));

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

    consoleLog('info', `Saving ${key} in S3...`);
    nfx.awsSDK.s3.upload(params, function(err, data) {
      if (err) {
        consoleLog('err', `Error on saving template ${err}`);
        reject(err);
      }

      consoleLog('info', `Successfully saved ${key}`);
      resolve();
    });
  });
}

function updateNFXJSON(nfx) {
  return new Promise((resolve, reject) => {
    const pipeHashPromises = [];
    pipeHashPromises.push(pipeHash(nfx, 'api.yaml'));
    pipeHashPromises.push(pipeHash(nfx, 'functions.yaml'));
    Promise.all(pipeHashPromises).then(() => {
      nfx.hasher.end();

      const params = {
        Bucket: nfx.bucketName,
        Key: 'nfx.json',
      };

      nfx.awsSDK.s3.getObject(params, function(err, data) {
        let nfxJSON = {}
        if (err) {
          if (err.message.indexOf('does not exist') > -1) {
            nfxJSON['version_hashes'] = {}
          } else {
            reject(err);
          }
        } else {
          nfxJSON = JSON.parse(data.Body);
        }
        nfxJSON['active_version'] = nfx.version;
        nfxJSON['version_hashes'][`${nfx.version}`] = nfx.hasher.read().toString('hex');
        uploadS3(nfx, 'nfx.json', JSON.stringify(nfxJSON), 'application/json')
          .then(resolve)
          .catch(reject)
      });
    });
  });
}

function pipeHash(nfx, file) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(file);
    readStream.once('end', resolve);
    readStream.pipe(nfx.hasher, { end: false });
  });
}
