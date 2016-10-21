'use strict';

const log = require('../utils/log');

module.exports = function getFunctionPhysicalResourceName(nfx, resourceName) {
  const cf = nfx.aws.cf;

  const params = {
    LogicalResourceId: resourceName,
    StackName: nfx.stackName
  };

  return cf.describeStackResource(params).promise()
    .then((data) => {
      return Promise.resolve(data.StackResourceDetail.PhysicalResourceId);
    })
    .catch((err) => {
      return Promise.reject(err)
    });
};
