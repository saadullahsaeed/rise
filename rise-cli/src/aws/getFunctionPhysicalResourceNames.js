'use strict';

module.exports = function getFunctionPhysicalResourceNames(nfx, resourcesName) {
  const describePromises = [];
  for (let i = 0; i < resourcesName.length; ++i) {
    describePromises.push(
      describeStackResource(nfx, resourcesName[i])
    );
  }

  return Promise.all(describePromises).then((names) => {
    return Promise.resolve(names);
  });
};

function describeStackResource(nfx, resourceName) {
  const params = {
    LogicalResourceId: resourceName,
    StackName: nfx.stackName
  };

  return nfx.aws.cf.describeStackResource(params).promise()
    .then((data) => {
      return Promise.resolve({
        resourceName,
        physicalResourceName: data.StackResourceDetail.PhysicalResourceId
      });
    });
}
