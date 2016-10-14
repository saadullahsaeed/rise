'use strict';

const path = require('path'),
      log = require('../utils/log'),
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports = function getStack(nfx) {
  return nfx.aws.cf.describeStacks({
    StackName: nfx.stackName
  }).promise()
    .then(function() {
      return Promise.resolve(nfx);
    })
    .catch(function(err) {
      if (err && err.message.indexOf('does not exist') > -1) {
        log.info(`Stack [${nfx.stackName}] could not be found. Creating...`);
        return createStack(nfx);
      }

      return Promise.reject(err);
    });
};

function createStack(nfx) {
  const cf = nfx.aws.cf,
        content = fsReadFile(path.join(__dirname, 'cf-base.json')),
        params = {
          StackName: nfx.stackName,
          TemplateBody: content,
          Capabilities: ['CAPABILITY_IAM'],
          NotificationARNs: [],
          OnFailure: 'ROLLBACK'
        };

  return cf.createStack(params)
        .promise()
        .then(function() {
          return waitForCreate(nfx);
        });

}

function waitForCreate(nfx) {
  const cf = nfx.aws.cf;

  nfx.state = 'CREATING';
  log.info(`Creating stack [${nfx.stackName}]...`);
  return cf.waitFor('stackCreateComplete', { StackName: nfx.stackName })
    .promise()
    .then(() => {
      log.info(`Created stack [${nfx.stackName}]...`);
      nfx.state = 'CREATED';
      return Promise.resolve(nfx);
    });
}
