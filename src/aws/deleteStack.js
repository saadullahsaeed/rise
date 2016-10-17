'use strict';

const log = require('../utils/log');

module.exports = function deleteStack(nfx) {
  const cf = nfx.aws.cf;

  nfx.state = 'DELETING';
  return cf.deleteStack({
    StackName: nfx.stackName
  }).promise()
  .then(function() {
    return waitForDelete(nfx);
  });
};

function waitForDelete(nfx) {
  const cf = nfx.aws.cf;

  log.info(`Deleting stack [${nfx.stackName}]...`);
  return cf.waitFor('stackDeleteComplete', { StackName: nfx.stackName }).promise()
    .then(() => {
      log.info(`Deleted stack [${nfx.stackName}]...`);
      nfx.state = 'DELETED';
      return Promise.resolve(nfx);
    });
}
