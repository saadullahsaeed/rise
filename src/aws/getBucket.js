'use strict';

const log = require('../utils/log');

module.exports = function getBucket(nfx) {
  return nfx.aws.s3.headBucket({ Bucket: nfx.bucketName })
    .promise()
    .then(function(/* data */) {
      // TODO: We need to make sure it belongs to current project by comparing uuid.
      // Create unique project ID when stack gets created.
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
