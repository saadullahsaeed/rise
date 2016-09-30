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
      DeployFunctions       = require('../aws/deployFunctions').DeployFunctions;

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
    .then(() => {
      return DeployFunctions(cf, stackName, functions.functions);
    })
    .then(() => {
      // YC STOP HERE, sunjin can continue here
      // return DeployAPI();
    })
    .catch((err) => {
      ConsoleLog('err', err);
    });
}

// Update api.yaml to s3
/*
const s3 = new AWS.S3();
const apiS3Key = 'api-' + version + '.yaml';
const params = {
  Bucket: bucketName,
  Key: apiS3Key,
  ACL: 'private',
  Body: fs.createReadStream('api.yaml'),
  ContentType: 'text/yaml'
};

s3.upload(params, function(err, data) {
  if (err) {
    ConsoleLog('err', `Error on uploading api.yaml ${err}`);
    return
  }
  ConsoleLog('info', `Successfully uploaded api.yaml`);

  tmpl.Resources.NFXApi = {
    "Type" : "AWS::ApiGateway::RestApi",
    "Properties" : {
      "BodyS3Location" : {
        "Bucket" : bucketName,
        "Key": apiS3Key
      }
    }
  }
});
*/

function fsReadFile(path) {
  try {
    return fs.readFileSync(path);
  } catch (err) {
    console.log(err);
    return false;
  }
}
