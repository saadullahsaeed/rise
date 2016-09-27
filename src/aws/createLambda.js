'use strict';

const fs         = require('fs'),
      path       = require('path'),
      ConsoleLog = require('../utils/consoleLog').ConsoleLog;

module.exports.CreateLambda = function(cf, stackName, bucketName) {
  return new Promise((resolve, reject) => {
    const content = fsReadFile(path.join(__dirname, 'cf-create-lambda.json'));
    if (!content) {
      reject('CreateLambda error.');
    }

    let cfJSON = JSON.parse(content);
    cfJSON.Description = `${stackName} NFX stack.`;
    cfJSON.Resources.NFXDeploymentBucket.Properties.BucketName = bucketName;

    let cfJSONString = JSON.stringify(cfJSON);
    cfJSONString = cfJSONString.replace('$S3KEY', 'hello.zip');

    const req = cf.updateStack({
      StackName: stackName,
      TemplateBody: cfJSONString,
      Capabilities: ['CAPABILITY_IAM'],
    });

    req.on('success', function(resp) {
      ConsoleLog('note', `Creating Lambda functions...`);
      cf.waitFor('stackUpdateComplete', { StackName: stackName }, function(err, data) {
        if (err) {
          reject(err);
        }

        resolve();
      });
    });

    req.on('error', function(err, data) {
      reject(err.message);
    });

    req.send();
  });
}

function fsReadFile(path) {
  try {
    return fs.readFileSync(path);
  } catch (err) {
    return false;
  }
}
