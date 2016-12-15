'use strict';

const path = require('path'),
      log = require('../utils/log'),
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports = function getStack(session) {
  session.state = 'FETCHING_STACK';

  return session.aws.cf.describeStacks({
    StackName: session.stackName
  }).promise()
    .then(function() {
      session.state = 'FETCHED_STACK';
      return Promise.resolve(session);
    })
    .catch(function(err) {
      if (err && err.message.indexOf('does not exist') > -1) {
        log.info(`Stack [${session.stackName}] could not be found. Creating...`);
        return createStack(session);
      }

      return Promise.reject(err);
    });
};

function createStack(session) {
  const cf = session.aws.cf,
        content = fsReadFile(path.join(__dirname, 'cf-base.json')),
        params = {
          StackName: session.stackName,
          TemplateBody: content,
          Capabilities: ['CAPABILITY_IAM'],
          NotificationARNs: [],
          OnFailure: 'ROLLBACK'
        };

  return cf.createStack(params)
        .promise()
        .then(function() {
          return waitForCreate(session);
        });
}

function waitForCreate(session) {
  const cf = session.aws.cf;

  session.state = 'CREATING';
  log.info(`Creating stack [${session.stackName}]...`);
  return cf.waitFor('stackCreateComplete', { StackName: session.stackName })
    .promise()
    .then(() => {
      log.info(`Created stack [${session.stackName}]...`);
      session.state = 'CREATED';
      return Promise.resolve(session);
    });
}
