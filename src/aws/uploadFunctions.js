'use strict';

const fs = require('fs'),
      log = require('../utils/log');

module.exports = function uploadFunctions(nfx) {
  const uploadPromises = [];
  for (let i = 0; i < nfx.compressedFunctions.length; ++i) {
    const compressFunction = nfx.compressedFunctions[i];
    uploadPromises.push(
      upload(nfx, compressFunction)
    );
  }

  nfx.state = 'UPLOADING';
  return Promise.all(uploadPromises).then(() => {
    nfx.state = 'UPLOADED';
    log.info("All functions are uploaded");
    return Promise.resolve(nfx);
  }, (err) => {
    return Promise.reject(err);
  });
};

function upload(nfx, compressFunction) {
  const funcName = compressFunction.functionName,
        s3Key = `versions/${nfx.version}/functions/${funcName}.zip`,
        params = {
          Bucket: nfx.bucketName,
          Key: s3Key,
          ACL: 'private',
          Body: fs.createReadStream(compressFunction.filePath),
          ContentType: 'application/zip'
        };

  log.info(`Uploading ${s3Key} to bucket ${nfx.bucketName}...`);
  return nfx.aws.s3.putObject(params).promise()
    .then(function() {
      fs.unlinkSync(compressFunction.filePath);
      log.info(`Uploaded ${s3Key} to bucket ${nfx.bucketName}...`);
      return Promise.resolve();
    })
    .catch(function(err) {
      fs.unlinkSync(compressFunction.filePath);
      log.error(`Error on uploading function ${s3Key}: ${err}`);
      return Promise.reject(err);
    });
}
