'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog;

module.exports.createStack = (cf, stackName) => {
  return new Promise((resolve, reject) => {
    cf.describeStacks({
      StackName: stackName
    }, (err, data) => {
      if (err && err.message.indexOf('does not exist') > -1) {
        create(cf, stackName)
          .then(resolve)
          .catch((err) => reject(err));
      } else {
        resolve();
      }
    });
  });
}

function create(cf, stackName) {
  return new Promise((resolve, reject) => {
    const content = fsReadFile(path.join(__dirname, 'cf-base.json'));
    if (!content) {
      reject('CreateStack error.');
    }

    let cfJSON = JSON.parse(content);
    cfJSON.Description = `${stackName} NFX stack.`;

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
      consoleLog('info', `Creating stack [${stackName}]...`);
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
