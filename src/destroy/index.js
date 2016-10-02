"use strict";

const AWS                   = require('aws-sdk'),
      consoleLog            = require('../utils/consoleLog').consoleLog,
      loadYAML              = require('../utils/yaml').loadYAML;

module.exports = function() {
  const project   = loadYAML('project.yaml'),
        functions = loadYAML('functions.yaml');

  if (!project) {
    consoleLog('err', 'invalid project.yaml');
    process.exit(1);
  }

  if (!functions) {
    consoleLog('err', 'invalid functions.yaml');
    process.exit(1);
  }

  AWS.config.region = project.profiles.default.region;
  const cf = new AWS.CloudFormation();
  const params = {
    StackName: functions.stack
  };


  consoleLog('info', `destroying stack ${functions.stack}`);
  cf.deleteStack(params, function(err, data) {
    if (err) {
      consoleLog('info', `errors on deleting stack: ${err}`, err);
      process.exit(1)
    }

    consoleLog('info', 'successfully make a request to delete a stack');
    cf.waitFor('stackDeleteComplete', params, function(err, data) {
      if (err) {
        consoleLog('err', `failed to destroy the stack: ${err}`);
        process.exit(1);
      }
      consoleLog('info', `successfully destroyed stack ${functions.stack}`);
    });
  });
}
