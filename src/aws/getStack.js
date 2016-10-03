'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog;

module.exports.getStack = (nfx) => {
  return new Promise((resolve, reject) => {
    nfx.awsSDK.cf.describeStacks({
      StackName: nfx.stackName
    }, (err, data) => {
      if (err && err.message.indexOf('does not exist') > -1) {
        create(nfx)
          .then(resolve)
          .catch((err) => reject(err));
      } else {
        resolve();
      }
    });
  });
}

function create(nfx) {
  return new Promise((resolve, reject) => {
    const content = fsReadFile(path.join(__dirname, 'cf-base.json'));
    if (!content) {
      reject('getStack error.');
    }

    const cfJSON = JSON.parse(content);
    const req = nfx.awsSDK.cf.createStack({
      StackName: nfx.stackName,
      TemplateBody: JSON.stringify(cfJSON),
      Capabilities: ['CAPABILITY_IAM'],
      NotificationARNs: [],
      OnFailure: 'ROLLBACK',
      Tags: [
        { Key: 'environment', Value: 'test' }
      ]
    });

    req.on('success', function(resp) {
      consoleLog('info', `Creating stack [${nfx.stackName}]...`);
      nfx.awsSDK.cf.waitFor('stackCreateComplete',
        { StackName: nfx.stackName },
        function(err, data) {
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
