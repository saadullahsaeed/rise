'use strict';

const log = require('../utils/log');

module.exports = function getBucket(session) {
  session.state = 'FETCHING_BUCKET';
  return session.aws.s3.headBucket({ Bucket: session.bucketName })
    .promise()
    .then(function(/* data */) {
      session.state = 'FETCHED_BUCKET';
      log.info(`Existing bucket "${session.bucketName}" found.`);
      return Promise.resolve(session);
    })
    .catch(function(err) {
      if (err.code === 'NotFound') {
        log.info(`A bucket with the name "${session.bucketName}" doesn't already exist. Creating...`);
        return create(session);
      } else {
        return Promise.reject(err);
      }
    });
};

function create(session) {
  const params = {
    Bucket: session.bucketName,
    CreateBucketConfiguration: {
      LocationConstraint: session.region
    }
  };

  session.state = 'CREATING_BUCKET';
  return session.aws.s3.createBucket(params).promise()
    .then(function() {
      session.state = 'CREATED_BUCKET';
      return Promise.resolve(session);
    });
}
