'use strict';

module.exports.getBucketName = function(nfx) {
  return new Promise((resolve, reject) => {
    nfx.awsSDK.cf.describeStackResource({
      StackName: nfx.stackName,
      LogicalResourceId: 'NFXDeploymentBucket'
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        nfx.bucketName = data.StackResourceDetail.PhysicalResourceId;
        resolve(nfx);
      }
    });
  });
}
