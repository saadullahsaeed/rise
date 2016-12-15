'use strict';

const fs = require('fs'),
      log = require('../utils/log');

module.exports = function uploadFunctions(session) {
  const uploadPromises = [];
  for (let i = 0; i < session.compressedFunctions.length; ++i) {
    const compressFunction = session.compressedFunctions[i];
    uploadPromises.push(
      upload(session.aws.s3, session.bucketName, compressFunction)
    );
  }

  session.state = 'UPLOADING';
  return Promise.all(uploadPromises).then(() => {
    session.state = 'UPLOADED';
    log.info('All functions have been uploaded.');
    return Promise.resolve(session);
  }, (err) => {
    session.state = 'UPLOAD_FAILED';
    return Promise.reject(err);
  });
};

function upload(s3, bucketName, compressFunction) {
  const s3Key = compressFunction.uploadPath,
        params = {
          Bucket: bucketName,
          Key: s3Key,
          ACL: 'private',
          Body: fs.createReadStream(compressFunction.filePath),
          ContentType: 'application/zip'
        };

  log.info(`Uploading ${s3Key} to bucket ${bucketName}...`);
  return s3.putObject(params).promise()
    .then(function() {
      fs.unlinkSync(compressFunction.filePath);
      log.info(`Uploaded ${s3Key} to bucket ${bucketName}...`);
      return Promise.resolve();
    })
    .catch(function(err) {
      fs.unlinkSync(compressFunction.filePath);
      log.error(`Error on uploading function ${s3Key}: ${err}`);
      return Promise.reject(err);
    });
}
