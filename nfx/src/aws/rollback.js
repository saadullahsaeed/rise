'use strict';

const log = require('../utils/log');

module.exports = function rollback(nfx, version) {
  const cf = nfx.aws.cf;
  const params = {
    StackName: nfx.stackName,
    TemplateURL: `https://s3-${nfx.region}.amazonaws.com/${nfx.bucketName}/versions/${version}/aws/cf.json`,
    Capabilities: ['CAPABILITY_IAM']
  };

  log.info(`Updating stack to version ${version}...`);

  nfx.state = 'ROLLING_BACK';
  return cf.updateStack(params).promise()
    .then(function(/* data */) {
      nfx.version = version;
      return waitForUpdate(nfx);
    })
    .catch(function(err) {
      log.error(`Errors on making a request to update stack to version ${version}: ${err}`);
      return Promise.reject(err);
    });
};

function waitForUpdate(nfx) {
  const cf = nfx.aws.cf;

  log.info(`Rolling back stack [${nfx.stackName}]...`);
  return cf.waitFor('stackUpdateComplete', { StackName: nfx.stackName }).promise()
    .then(() => {
      log.info(`Rolling back stack [${nfx.stackName}]...`);
      nfx.state = 'ROLLED_BACK';
      return Promise.resolve(nfx);
    });
}
