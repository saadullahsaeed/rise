'use strict';

// FIXME: Should use S3 API to check if bucket exist
module.exports.getBucketName = function(nfx) {
  return new Promise((resolve, reject) => {
    nfx.awsSDK.cf.describeStackResource({
      StackName: nfx.stackName,
      LogicalResourceId: 'NFXDeploymentBucket'
    }, (err, data) => {
      if (err) {
        // FIXME create bucket here if it doesn't exist
        reject(err);
      } else {
        nfx.bucketName = data.StackResourceDetail.PhysicalResourceId;
        resolve(nfx);
      }
    });
  });
}
