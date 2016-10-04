'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog;

// It rolls back to nfx.version
module.exports.updateStackToVersion = function(nfx) {
  return new Promise((resolve, reject) => {
    const version = nfx.version;
    const cf = nfx.awsSDK.cf;
    const params = {
      StackName: nfx.stackName,
      TemplateURL: `https://s3-${nfx.region}.amazonaws.com/${nfx.bucketName}/versions/${version}.json`,
      Capabilities: ['CAPABILITY_IAM']
    };
    const req = cf.updateStack(params);

    consoleLog('info', `Updating stack to version ${version}...`);
    req.on('success', function(resp) {
      consoleLog('info', `Successfully made a request to update stack to ${version}...`);
      cf.waitFor('stackUpdateComplete',
        { StackName: nfx.stackName },
        function(err, data) {
        if (err) {
          consoleLog('err', `Failed to update stack to version ${version}: ${err}`);
          return;
        }

        consoleLog('info', `Successfully updated stack to version ${version}`);
        resolve(nfx);
      });
    });

    req.on('error', function(err, data) {
      consoleLog('err', `Errors on making a request to update stack to version ${version}: ${err}`);
      reject(err);
    });

    req.send();
  });
}
