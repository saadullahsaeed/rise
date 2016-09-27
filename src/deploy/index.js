"use strict";

const path                  = require('path'),
      fs                    = require('fs'),
      AWS                   = require('aws-sdk'),
      ConsoleLog            = require('../utils/consoleLog').ConsoleLog,
      LoadYAML              = require('../utils/yaml').LoadYAML,
      CreateStack           = require('../aws/createStack').CreateStack,
      DescribeStacks        = require('../aws/describeStacks').DescribeStacks,
      DescribeStackResource = require('../aws/describeStackResource').DescribeStackResource,
      UploadToS3            = require('../aws/uploadToS3').UploadToS3,
      CreateLambda          = require('../aws/createLambda').CreateLambda;

module.exports = function() {
  // 1. Read project.yaml to get region and bucket name
  // 2. Read functions.yaml
  // 2. Get bucket name
  // 3. Create a stack with bucket name if the stack does not exist
  // 4. Update the stack if it exists
  //
  // 1. When the stack does not exist
  // What if
  //  1. If the credential is invalid
  //    : ask users to configure aws credential.
  //  2. the bucket exists
  //    : it failes to create a stack.

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

  AWS.config.region = 'ap-southeast-1';
  const cf = new AWS.CloudFormation({ apiVersion: '2010-05-15' });
  const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

  const stackName = functions.stack;
  const bucketName = project.profiles.default.bucket;


  // FIXME: FIX promise hell
  // Stack exist?
  //   yes: bucket exist?
  //     yes: upload
  //     no: create bucket and upload
  //   no: create stack, create bucket, upload

  ConsoleLog('note', 'Checking stack...');
  DescribeStacks(cf, stackName)
    .then(() => {
      ConsoleLog('note', `Stack [${stackName}] found.`);
      ConsoleLog('note', 'Checking bucket...');
      DescribeStackResource(cf, stackName, bucketName)
        .then((stackResourceDetail) => {
          ConsoleLog('note', `Using bucket [${bucketName}]...`);
          const bucketResourceId = stackResourceDetail.PhysicalResourceId;
          const content = fsReadFile('functions.zip');
          UploadToS3(s3, bucketResourceId, `${stackName}.zip`, content)
            .then(() => {
              ConsoleLog('note', 'Uploaded Lambda functions to S3.');
              CreateLambda(cf, stackName, bucketName)
                .then(() => {
                  ConsoleLog('note', 'Created Lambda functions');
                  // >>> YC's day end here <<<
                })

            })
            .catch(() => {
              ConsoleLog('err', 'Failed to upload to S3.');
            });

        })
        .catch(() => {
          // create bucket if missing
        });
    })
    .catch((errMsg) => {
      if (errMsg.indexOf('does not exist') !== -1) {
        CreateStack(cf, stackName, bucketName)
          .then(() => {
            ConsoleLog('note', `Stack [${stackName}] created.`);
            DescribeStackResource(cf, stackName, bucketName)
              .then((stackResourceDetail) => {
                ConsoleLog('note', `Using bucket [${bucketName}]...`);
                const bucketResourceId = stackResourceDetail.PhysicalResourceId;
                const content = fsReadFile('functions.zip');
                UploadToS3(s3, bucketResourceId, `${stackName}.zip`, content)
                  .then(() => {
                    ConsoleLog('note', 'Uploaded Lambda functions to S3.');
                    CreateLambda(cf, stackName, bucketName)
                      .then(() => {
                        ConsoleLog('note', 'Created Lambda functions');
                      });
                  });
              });
          });
      }
    });
}

function fsReadFile(path) {
  try {
    return fs.readFileSync(path);
  } catch (err) {
    console.log(err);
    return false;
  }
}
