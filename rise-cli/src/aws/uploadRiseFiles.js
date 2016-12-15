'use strict';

const fs = require('fs'),
      log = require('../utils/log');

module.exports = function uploadRiseFiles(session) {
  const s3 = session.aws.s3,
        bucketName = session.bucketName,
        uploadS3Promises = [];

  session.state = 'UPLOADING_RISE_FILES';
  const riseFiles = [{
    key: `versions/${session.version}/aws/cf.json`,
    body: JSON.stringify(session.aws.cfTemplate, null, 2),
    contentType: 'application/json'
  }, {
    key: `versions/${session.version}/routes.yaml`,
    body: fs.createReadStream('routes.yaml'),
    contentType: 'text/yaml'
  }, {
    key: `versions/${session.version}/rise.yaml`,
    body: fs.createReadStream('rise.yaml'),
    contentType: 'text/yaml'
  }, {
    key: 'rise.json',
    body: JSON.stringify(session.riseJSON),
    contentType: 'application/json'
  }];

  for (let i = 0; i < riseFiles.length; i++) {
    uploadS3Promises.push(
      upload(s3, bucketName, riseFiles[i].key, riseFiles[i].body, riseFiles[i].contentType)
    );
  }

  return Promise.all(uploadS3Promises)
        .then(function() {
          session.state = 'UPLOADED_RISE_FILES';
          return Promise.resolve(session);
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
