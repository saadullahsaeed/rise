'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports.deployAPIs = function(nfx) {
  return new Promise((resolve, reject) => {
    let cfDeploymentContent = fsReadFile(path.join(__dirname, 'cf-deployment.json'));

    const cfDeploymentJSON = JSON.parse(
      cfDeploymentContent
        .replace('$STAGE_NAME', nfx.stage)
        .replace('$DESCRIPTION', nfx.version)
    );
    nfx.cfTemplate.Resources.NFXDeployment = cfDeploymentJSON;

    const req = nfx.awsSDK.cf.updateStack({
      StackName: nfx.stackName,
      TemplateBody: JSON.stringify(nfx.cfTemplate, null, 2),
      Capabilities: ['CAPABILITY_IAM']
    });

    req.on('success', function(resp) {
      consoleLog('info', `Deploying API...`);
      nfx.awsSDK.cf.waitFor('stackUpdateComplete',
        { StackName: nfx.stackName },
        function(err, data) {
        if (err) {
          reject(err);
          return;
        }

        consoleLog('info', "Successfully deployed API.");
        resolve(nfx);
      });
    });

    req.on('error', function(err, data) {
      reject(err.message);
    });

    req.send();
  });
}
