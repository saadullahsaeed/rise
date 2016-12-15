'use strict';

const log = require('../utils/log');

module.exports = function deleteStack(session) {
  const cf = session.aws.cf;

  session.state = 'DELETING';
  return cf.deleteStack({
    StackName: session.stackName
  }).promise()
  .then(function() {
    return waitForDelete(session);
  });
};

function waitForDelete(session) {
  const cf = session.aws.cf;

  log.info(`Deleting stack [${session.stackName}]...`);
  return cf.waitFor('stackDeleteComplete', { StackName: session.stackName }).promise()
    .then(() => {
      log.info(`Deleted stack [${session.stackName}]...`);
      session.state = 'DELETED';
      return Promise.resolve(session);
    });
}
