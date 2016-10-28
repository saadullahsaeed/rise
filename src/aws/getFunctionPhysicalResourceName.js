'use strict';

module.exports = function getFunctionPhysicalResourceName(nfx, resourceName) {
  const cf = nfx.aws.cf;

  const params = {
    LogicalResourceId: resourceName,
    StackName: nfx.stackName
  };

  return cf.describeStackResource(params).promise()
    .then((data) => {
      return Promise.resolve(data.StackResourceDetail.PhysicalResourceId);
    });
};
