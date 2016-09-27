'use strict';

const fs         = require('fs'),
      path       = require('path'),
      ConsoleLog = require('../utils/consoleLog').ConsoleLog;

module.exports.CreateStack = function(cf, stackName, bucketName) {
  return new Promise((resolve, reject) => {
    const content = fsReadFile(path.join(__dirname, 'cf-create-stack.json'));
    if (!content) {
      reject('CreateStack error.');
    }

    let cfJSON = JSON.parse(content);
    cfJSON.Description = `${stackName} NFX stack.`;
    cfJSON.Resources.NFXDeploymentBucket.Properties.BucketName = bucketName;

    const req = cf.createStack({
      StackName: stackName,
      TemplateBody: JSON.stringify(cfJSON),
      Capabilities: ['CAPABILITY_IAM'],
      NotificationARNs: [],
      OnFailure: 'ROLLBACK',
      Tags: [
      { Key: 'environment', Value: 'test' }
      ]
    });

    req.on('success', function(resp) {
      ConsoleLog('note', `Creating stack [${stackName}]...`);
      cf.waitFor('stackCreateComplete', { StackName: stackName }, function(err, data) {
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
