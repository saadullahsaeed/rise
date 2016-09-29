"use strict";

const path                  = require('path'),
      fs                    = require('fs'),
      archiver              = require('archiver'),
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

  AWS.config.region = project.profiles.default.region;
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
  DescribeStacks(cf, stackName).then(() => {
    ConsoleLog('note', `Stack [${stackName}] found.`);
    ConsoleLog('note', 'Checking bucket...');
    UpdateStack(cf, stackName, bucketName, functions.functions);
  }).catch((errMsg) => {
    console.log(errMsg);
    if (errMsg.indexOf('does not exist') !== -1) {
      CreateStack(cf, stackName, bucketName).then(() => {
        ConsoleLog('note', `Stack [${stackName}] created.`);
        UpdateStack(cf, stackName, bucketName, functions.functions);
      });
    }
  });
}

function UpdateStack(cf, stackName, bucketName, functions) {
  DescribeStackResource(cf, stackName, bucketName).then((stackResourceDetail) => {
    ConsoleLog('note', `Using bucket [${bucketName}]...`);
    const bucketResourceID = stackResourceDetail.PhysicalResourceId;

    // GetTemplate
    cf.getTemplate({StackName: stackName}, function(err, data) {
      if (err) {
        ConsoleLog('err', `Failed to fetch template: ${err}`)
        process.exit(1);
      }
      ConsoleLog('info', `Successfully fetched the template`)
      const tmpl = JSON.parse(data.TemplateBody);
      tmpl.Outputs = tmpl.Outputs || {};

      // Zip and Upload functions to S3
      const funcPaths = Object.keys(functions);
      const version = '0.0.1' // FIXME: hardcode it for now.
      const compressAndUploadPromises = []
      for ( var i = 0; i < funcPaths.length; ++i) {
        const funcPath = funcPaths[i];
        const funcName = path.basename(funcPath);
        const func = functions[funcPath];

        if (funcPath === 'default') {
          continue;
        }

        console.log('hi');
        compressAndUploadPromises.push(compressAndUpload(bucketName, version, funcPath, funcName, func, tmpl));
        console.log('lol');
      }

      console.log('compressaAndUploadPromises');
      Promise.all(compressAndUploadPromises).then( () => {
        console.log("start updating stack");
        const updateStackOption = {
          StackName: stackName,
          TemplateBody: JSON.stringify(tmpl, null, 2),
          Capabilities: ['CAPABILITY_IAM'],
        };

        cf.updateStack(updateStackOption, (err, data) => {
          ConsoleLog('info', `Updating the stack`);
          cf.waitFor('stackUpdateComplete', { StackName: stackName }, (err, data) => {
            if (err) {
              ConsoleLog('err', `Failed to update stack: ${err}`);
              process.exit(1);
            }
            ConsoleLog('info', 'Successfully updated stack');
            // Returns arn of lambda function
            console.log(data.Stacks[0].Outputs[0]);
          });
        });
      }, (err) => {
        console.log('error!!!', err);
      });
      console.log('asdasd');
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
    });
  }).catch((err, b,c) => {
    console.log(err, b, c);
  })
}

function compressAndUpload(bucketName, version, funcPath, funcName, func, tmpl) {
  return new Promise( (resolve, reject) => {
    process.nextTick(() => {
      console.log(version, funcPath, funcName, func);
      ConsoleLog('info', `Uploading ${funcName}`);

      // Compress files
      const zipArchive = archiver.create('zip');
      const tempFileName = '/tmp/fn-' + funcName + '-' + new Date().getTime() + '.zip';
      const output = new fs.createWriteStream(tempFileName);
      const s3Key = funcName + '-' + version + '.zip';

      console.log('before close');
      output.on('close', function() {
        const s3 = new AWS.S3();
        const params = {
          Bucket: bucketName,
          Key: s3Key,
          ACL: 'private',
          Body: fs.createReadStream(tempFileName),
          ContentType: 'application/zip'
        };

        // Uplaod to S3
        console.log('wait for upload');
        s3.upload(params, function(err, data) {
          fs.unlinkSync(tempFileName);

          if (err) {
            ConsoleLog('err', `Error on uploading function ${err}`);
            reject(err);
          }

          ConsoleLog('info', `Successfully uploaded ${s3Key}`);
          // Create/Update lambda function
          tmpl.Resources[funcName] = {
            Type: "AWS::Lambda::Function",
            Properties: {
              Handler: func.handler + ".handler",
              Role: {
                "Fn::GetAtt": [
                  "NFXRole", // FIXME: should it be hardcoded
                  "Arn"
                ]
              },
              Code: {
                S3Bucket: bucketName,
                S3Key: s3Key
              },
              Runtime: "nodejs4.3",
              Timeout: func.timeout,
              // Memory: func.memory
            }
          };

          // Set output for each function
          tmpl.Outputs[funcName] = {
            Value: {
              "Fn::Join": [
                "",
                [
                  "arn:aws:apigateway:",
                  {
                    "Ref": "AWS::Region"
                  },
                  ":lambda:path/2015-03-31/functions/",
                  {
                    "Fn::GetAtt": [
                      funcName,
                      "Arn"
                    ]
                  },
                  "/invocations"
                ]
              ]
            }
          };

          resolve();
        });
      });
      zipArchive.pipe(output);
      zipArchive.bulk([
        { src: [ '**/*' ], cwd: funcPath, expand: true }
      ]);

      zipArchive.finalize();
      console.log("1");
    });
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
