'use strict';

const fs = require('fs'),
      log = require('../utils/log');

module.exports = function uploadNFXFiles(nfx) {
  const s3 = nfx.aws.s3,
        bucketName = nfx.bucketName,
        uploadS3Promises = [];

  const nfxFiles = [{
    key: `versions/${nfx.version}/aws/cf.json`,
    body: JSON.stringify(nfx.cfTemplate, null, 2),
    contentType: 'application/json'
  }, {
    key: `versions/${nfx.version}/routes.yaml`,
    body: fs.createReadStream('routes.yaml'),
    contentType: 'text/yaml'
  }, {
    key: `versions/${nfx.version}/nfx.yaml`,
    body: fs.createReadStream('nfx.yaml'),
    contentType: 'text/yaml'
  }, {
    key: 'nfx.json',
    body: JSON.stringify(nfx.nfxJSON),
    contentType: 'application/json'
  }];

  for (let i = 0; i < nfxFiles.length; i++) {
    uploadS3Promises.push(
      upload(s3, bucketName, nfxFiles[i].key, nfxFiles[i].body, nfxFiles[i].contentType)
    );
  }

  return Promise.all(uploadS3Promises)
        .then(function() {
          return Promise.resolve(nfx);
        });
};

function upload(s3, bucketName, key, body, contentType) {
  const params = {
    Bucket: bucketName,
    Key: key,
    ACL: 'private',
    Body: body,
    ContentType: contentType
  };

  log.info(`Saving ${key} in S3...`);
  return s3.putObject(params).promise();
}
