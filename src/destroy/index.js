"use strict";

const AWS                   = require('aws-sdk'),
      ConsoleLog            = require('../utils/consoleLog').ConsoleLog,
      LoadYAML              = require('../utils/yaml').LoadYAML,
      CreateLambda          = require('../aws/createLambda').CreateLambda;

module.exports = function() {
  const project   = LoadYAML('project.yaml'),
        functions = LoadYAML('functions.yaml');

  if (!project) {
    ConsoleLog('err', 'invalid project.yaml');
    process.exit(1);
  }

  if (!functions) {
    ConsoleLog('err', 'invalid functions.yaml');
    process.exit(1);
  }

  AWS.config.region = project.profiles.default.region;
  const cf = new AWS.CloudFormation();
  const params = {
    StackName: functions.stack
  };


  ConsoleLog('info', `destroying stack ${functions.stack}`);
  cf.deleteStack(params, function(err, data) {
    if (err) {
      ConsoleLog('info', `errors on deleting stack: ${err}`, err);
      process.exit(1)
    }

    ConsoleLog('info', 'successfully make a request to delete a stack');
    cf.waitFor('stackDeleteComplete', params, function(err, data) {
      if (err) {
        ConsoleLog('err', `failed to destroy the stack: ${err}`);
        process.exit(1);
      }
      ConsoleLog('info', `successfully destroyed stack ${functions.stack}`);
    });
  });
}
