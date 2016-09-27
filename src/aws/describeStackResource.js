'use strict';

// FIXME: Should use S3 API to check if bucket exist
module.exports.DescribeStackResource = function(cf, stackName, resourseId) {
  return new Promise((resolve, reject) => {
    cf.describeStackResource({
      StackName: stackName,
      LogicalResourceId: 'NFXDeploymentBucket'
    }, (err, data) => {
      if (err) {
        reject(err.message);
      } else {
        resolve(data.StackResourceDetail);
      }
    });
  });
}
