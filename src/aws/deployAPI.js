'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports.deployAPI = function(nfx) {
  return new Promise((resolve, reject) => {
    setDeployment(nfx);

    const req = nfx.awsSDK.cf.updateStack({
      StackName: nfx.stackName,
      TemplateBody: JSON.stringify(nfx.cfTemplate, null, 2),
      Capabilities: ['CAPABILITY_IAM']
    });

    req.on('success', function(resp) {
      consoleLog('info', `Updating stack with new deployment ${nfx.version}...`);
      nfx.awsSDK.cf.waitFor('stackUpdateComplete',
        { StackName: nfx.stackName },
        function(err, data) {
          if (err) {
            reject(err);
            return;
          }

          consoleLog('info', `Successfully deployed.`);
          resolve(nfx);
        }
      );
    });

    req.on('error', function(err, data) {
      if (err.message && err.message.indexOf('No updates are to be performed') !== -1) {
        consoleLog('info', "No updates on deployment. Proceed to the next step");
        resolve(nfx);
      } else {
        reject(err);
      }
    });

    req.send();
  });
}

function setDeployment(nfx) {
  let cfDeploymentContent = fsReadFile(path.join(__dirname, 'cf-deployment.json'));

  cfDeploymentContent = cfDeploymentContent.replace('$STAGE_NAME', nfx.stage);
  const cfDeploymentJSON = JSON.parse(cfDeploymentContent);
  nfx.cfTemplate.Resources[`NFXDeployment${nfx.version}`] = JSON.parse(cfDeploymentContent);

  let cfBaseURLOutputContent = fsReadFile(path.join(__dirname, 'cf-api-base-url-output.json'));
  cfBaseURLOutputContent = cfBaseURLOutputContent.replace('$STAGE_NAME', nfx.stage);
  nfx.cfTemplate.Outputs.NFXBaseURL = JSON.parse(cfBaseURLOutputContent);
}
