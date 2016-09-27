'use strict';

module.exports.DescribeStacks = function(cf, stackName) {
  return new Promise((resolve, reject) => {
    cf.describeStacks({
      StackName: stackName
    }, (err, data) => {
      if (err) {
        reject(err.message);
      } else {
        resolve(data.Stacks);
      }
    });
  });
}
