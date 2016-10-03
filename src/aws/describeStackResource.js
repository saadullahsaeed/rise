'use strict';

// FIXME: Should use S3 API to check if bucket exist
module.exports.describeStackResource = function(nfx) {
  return new Promise((resolve, reject) => {
    nfx.awsSDK.cf.describeStackResource({
      StackName: nfx.stackName,
      LogicalResourceId: 'NFXDeploymentBucket' //FIXME
    }, (err, data) => {
      if (err) {
        // FIXME create bucket here if it doesn't exist
        console.log(err.message);
        reject(err.message);
      } else {
        resolve(data.StackResourceDetail);
      }
    });
  });
}
