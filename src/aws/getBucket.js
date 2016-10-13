'use strict';

module.exports.getBucket = function(nfx) {
  return new Promise((resolve, reject) => {
    let isBucketExist = false;
    nfx.awsSDK.s3.headBucket({ Bucket: nfx.bucketName }, (err, data) => {
      if (err) {
        if (err.code === 'NotFound') {
          create(nfx)
            .then(() => resolve(nfx))
            .catch((err) => reject(err));
        } else {
          reject(err);
        }
      } else {
        resolve(nfx);
      }
    });
  });
}

function create(nfx) {
  return new Promise((resolve, reject) => {
    var params = {
      Bucket: nfx.bucketName,
      CreateBucketConfiguration: {
        LocationConstraint: nfx.region
      }
    };
    nfx.awsSDK.s3.createBucket(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
