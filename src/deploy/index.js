"use strict";

const path                  = require('path'),
      fs                    = require('fs'),
      archiver              = require('archiver'),
      AWS                   = require('aws-sdk'),
      ConsoleLog            = require('../utils/consoleLog').ConsoleLog,
      LoadYAML              = require('../utils/yaml').LoadYAML,
      CompressAndUpload     = require('../aws/compressAndUpload').CompressAndUpload,
      CreateStack           = require('../aws/createStack').CreateStack,
      DescribeStackResource = require('../aws/describeStackResource').DescribeStackResource,
      DeployFunctions       = require('../aws/deployFunctions').DeployFunctions,
      UploadAPITemplate     = require('../aws/uploadAPITemplate').UploadAPITemplate,
      updateAPIs            = require('../aws/updateAPIs').updateAPIs,
      deployAPIs            = require('../aws/deployAPIs').deployAPIs;

module.exports = function() {
  const project   = LoadYAML('project.yaml'),
        functions = LoadYAML('functions.yaml');
  if (!project) {
    ConsoleLog('err', 'Invalid project.yaml.');
    process.exit(1);
  }
  if (!functions) {
    ConsoleLog('err', 'Invalid functions.yaml.');
    process.exit(1);
  }

  AWS.config.region = project.profiles.default.region;
  const cf = new AWS.CloudFormation({ apiVersion: '2010-05-15' });
  const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

  const stackName = functions.stack;
  const bucketName = project.profiles.default.bucket;

  ConsoleLog('info', 'Checking stack...');
  CreateStack(cf, stackName)
    .then(() => {
      return DescribeStackResource(cf, stackName, bucketName);
    })
    .then((stackResourceDetail) => {
      return CompressAndUpload(functions.functions, stackResourceDetail.PhysicalResourceId);
    })
    .then((bucketName) => {
      return DeployFunctions(cf, stackName, functions.functions, bucketName);
    })
    .then((result) => {
      return UploadAPITemplate(result.cfTemplate, result.bucketName, result.outputs);
    })
    .then((cfContent) => {
      return updateAPIs(cf, stackName, cfContent);
    })
    .then((cfContent) => {
      return deployAPIs(cf, stackName, cfContent);
    })
    .catch((err) => {
      ConsoleLog('err', err);
    });
}

function fsReadFile(path) {
  try {
    return fs.readFileSync(path, {encoding: 'utf8'});
  } catch (err) {
    ConsoleLog('err', err);
    return false;
  }
}
