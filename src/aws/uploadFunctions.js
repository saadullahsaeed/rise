'use strict';

const fs = require('fs'),
      log = require('../utils/log');

module.exports = function uploadFunctions(nfx) {
  const uploadPromises = [];
  for (let i = 0; i < nfx.compressedFunctions.length; ++i) {
    const compressFunction = nfx.compressedFunctions[i];
    uploadPromises.push(
      upload(nfx.aws.s3, nfx.bucketName, compressFunction)
    );
  }

  nfx.state = 'UPLOADING';
  return Promise.all(uploadPromises).then(() => {
    nfx.state = 'UPLOADED';
    log.info("All functions are uploaded");
    return Promise.resolve(nfx);
  }, (err) => {
    nfx.state = 'UPLOAD_FAILED';
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
