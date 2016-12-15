'use strict';

const log = require('../utils/log');

module.exports = function rollback(session, version) {
  const cf = session.aws.cf;
  const params = {
    StackName: session.stackName,
    TemplateURL: `https://s3-${session.region}.amazonaws.com/${session.bucketName}/versions/${version}/aws/cf.json`,
    Capabilities: ['CAPABILITY_IAM']
  };

  log.info(`Updating stack to version ${version}...`);

  session.state = 'ROLLING_BACK';
  return cf.updateStack(params).promise()
    .then(function(/* data */) {
      session.version = version;
      return waitForUpdate(session);
    })
    .catch(function(err) {
      log.error(`Errors on making a request to update stack to version ${version}: ${err}`);
      return Promise.reject(err);
    });
};

function waitForUpdate(session) {
  const cf = session.aws.cf;

  log.info(`Rolling back stack [${session.stackName}]...`);
  return cf.waitFor('stackUpdateComplete', { StackName: session.stackName }).promise()
    .then(() => {
      log.info(`Rolling back stack [${session.stackName}]...`);
      session.state = 'ROLLED_BACK';
      return Promise.resolve(session);
    });
}
