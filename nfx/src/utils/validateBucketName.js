'use strict';

module.exports = function validateBucketName(bucketName) {
  if (bucketName.length < 3 || bucketName.length > 63) {
    return new Error('Bucket name is too short or too long. (>= 3, <= 63).');
  }

  const labels = bucketName.split('.');
  for (let i = 0; i < labels.length; ++i) {
    const label = labels[i];
    if (!label.match(/^[a-z0-9][a-z0-9-]*$/)) {
      return new Error('Bucket name is invalid.');
    }
  }

  if (bucketName.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
    return new Error('Bucket name can be formatted as an IP address.');
  }

  return null;
};
