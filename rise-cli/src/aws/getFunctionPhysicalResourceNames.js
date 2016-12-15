'use strict';

module.exports = function getFunctionPhysicalResourceNames(session, resourcesName) {
  const describePromises = [];
  for (let i = 0; i < resourcesName.length; ++i) {
    describePromises.push(
      describeStackResource(session, resourcesName[i])
    );
  }

  return Promise.all(describePromises).then((names) => {
    return Promise.resolve(names);
  });
};

function describeStackResource(session, resourceName) {
  const params = {
    LogicalResourceId: resourceName,
    StackName: session.stackName
  };

  return session.aws.cf.describeStackResource(params).promise()
    .then((data) => {
      return Promise.resolve({
        resourceName,
        physicalResourceName: data.StackResourceDetail.PhysicalResourceId
      });
    });
}
