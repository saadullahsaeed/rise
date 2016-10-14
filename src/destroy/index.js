"use strict";

const AWS                   = require('aws-sdk'),
      log = require('../utils/log'),
      loadYAML              = require('../utils/yaml').loadYAML;

module.exports = function() {
  const project   = loadYAML('project.yaml'),
        functions = loadYAML('functions.yaml');

  if (!project) {
    log.error('invalid project.yaml');
    process.exit(1);
  }

  if (!functions) {
    log.error('invalid functions.yaml');
    process.exit(1);
  }

  AWS.config.region = project.profiles.default.region;
  const cf = new AWS.CloudFormation();
  const params = {
    StackName: functions.stack
  };


  log.info(`destroying stack ${functions.stack}`);
  cf.deleteStack(params, function(err, data) {
    if (err) {
      log.info(`errors on deleting stack: ${err}`, err);
      process.exit(1)
    }

    log.info('successfully make a request to delete a stack');
    cf.waitFor('stackDeleteComplete', params, function(err, data) {
      if (err) {
        log.error(`failed to destroy the stack: ${err}`);
        process.exit(1);
      }
      log.info(`successfully destroyed stack ${functions.stack}`);
    });
  });
}
