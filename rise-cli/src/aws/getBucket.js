'use strict';

const log = require('../utils/log');

module.exports = function getBucket(nfx) {
  nfx.state = 'FETCHING_BUCKET';
  return nfx.aws.s3.headBucket({ Bucket: nfx.bucketName })
    .promise()
    .then(function(/* data */) {
      nfx.state = 'FETCHED_BUCKET';
      log.info(`Existing bucket "${nfx.bucketName}" found.`);
      return Promise.resolve(nfx);
    })
    .catch(function(err) {
      if (err.code === 'NotFound') {
        log.info(`A bucket with the name "${nfx.bucketName}" doesn't already exist. Creating...`);
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

  nfx.state = 'CREATING_BUCKET';
  return nfx.aws.s3.createBucket(params).promise()
    .then(function() {
      nfx.state = 'CREATED_BUCKET';
      return Promise.resolve(nfx);
    });
}
