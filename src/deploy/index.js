"use strict";

const path                  = require('path'),
      fs                    = require('fs'),
      archiver              = require('archiver'),
      AWS                   = require('aws-sdk'),
      consoleLog            = require('../utils/consoleLog').consoleLog,
      loadYAML              = require('../utils/yaml').loadYAML,
      compressAndUpload     = require('../aws/compressAndUpload').compressAndUpload,
      createStack           = require('../aws/createStack').createStack,
      describeStackResource = require('../aws/describeStackResource').describeStackResource,
      deployFunctions       = require('../aws/deployFunctions').deployFunctions,
      uploadAPITemplate     = require('../aws/uploadAPITemplate').uploadAPITemplate,
      updateAPIs            = require('../aws/updateAPIs').updateAPIs,
      deployAPIs            = require('../aws/deployAPIs').deployAPIs;

module.exports = function() {
  const project   = loadYAML('project.yaml'),
        functions = loadYAML('functions.yaml');
  if (!project) {
    consoleLog('err', 'Invalid project.yaml.');
    process.exit(1);
  }
  if (!functions) {
    consoleLog('err', 'Invalid functions.yaml.');
    process.exit(1);
  }

  AWS.config.region = project.profiles.default.region;
  const cf = new AWS.CloudFormation({ apiVersion: '2010-05-15' });
  const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

  const stackName = functions.stack;
  const bucketName = project.profiles.default.bucket;

  consoleLog('info', 'Checking stack...');
  createStack(cf, stackName)
    .then(() => {
      return describeStackResource(cf, stackName, bucketName);
    })
    .then((stackResourceDetail) => {
      return compressAndUpload(functions.functions, stackResourceDetail.PhysicalResourceId);
    })
    .then((bucketName) => {
      return deployFunctions(cf, stackName, functions.functions, bucketName);
    })
    .then((result) => {
      return uploadAPITemplate(result.cfTemplate, result.bucketName, result.outputs);
    })
    .then((cfContent) => {
      return updateAPIs(cf, stackName, cfContent);
    })
    .then((cfContent) => {
      return deployAPIs(cf, stackName, cfContent);
    })
    .catch((err) => {
      consoleLog('err', err);
    });
}

function fsReadFile(path) {
  try {
    return fs.readFileSync(path, {encoding: 'utf8'});
  } catch (err) {
    consoleLog('err', err);
    return false;
  }
}
