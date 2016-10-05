'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports.getStack = (nfx) => {
  return new Promise((resolve, reject) => {
    nfx.awsSDK.cf.describeStacks({
      StackName: nfx.stackName
    }, (err, data) => {
      if (err && err.message.indexOf('does not exist') > -1) {
        create(nfx)
          .then(() => resolve(nfx))
          .catch((err) => reject(err));
      } else if (!err) {
        // If outputs exist from previous deployment
        const content = fsReadFile(path.join(__dirname, 'cf-base.json'));
        const baseContentJSON = JSON.parse(content);
        nfx.cfTemplate = Object.assign({}, nfx.cfTemplate, baseContentJSON);

        if ( data.Stacks.length > 0 && data.Stacks[0].Outputs ) {
          nfx.lambdaARNs = data.Stacks[0].Outputs;
        }
        resolve(nfx);
      } else {
        reject(err);
      }
    });
  });
}

function create(nfx) {
  return new Promise((resolve, reject) => {
    const content = fsReadFile(path.join(__dirname, 'cf-base.json'));
    const req = nfx.awsSDK.cf.createStack({
      StackName: nfx.stackName,
      TemplateBody: content,
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
      reject(err);
    });

    req.send();
  });
}
