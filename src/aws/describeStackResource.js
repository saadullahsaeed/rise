'use strict';

// FIXME: Should use S3 API to check if bucket exist
module.exports.describeStackResource = function(cf, stackName, resourseId) {
  return new Promise((resolve, reject) => {
    cf.describeStackResource({
      StackName: stackName,
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
