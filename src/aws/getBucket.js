'use strict';

const log = require('../utils/log');

module.exports = function getBucket(nfx) {
  return nfx.aws.s3.headBucket({ Bucket: nfx.bucketName })
    .promise()
    .then(function(/* data */) {
      log.info(`bucket "${nfx.bucketName}" found.`);
      return Promise.resolve(nfx);
    })
    .catch(function(err) {
      if (err.code === 'NotFound') {
        log.info(`bucket "${nfx.bucketName}" could not be found. Creating...`);
        return create(nfx);
      } else {
        return Promise.reject(err);
      }
    });
};

function create(nfx) {
  const params = {
    Bucket: nfx.bucketName,
    CreateBucketConfiguration: {
      LocationConstraint: nfx.region
    }
  };

  return nfx.aws.s3.createBucket(params).promise();
}
