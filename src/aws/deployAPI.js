'use strict';

const fs         = require('fs'),
      path       = require('path'),
      log = require('../utils/log'),
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports.deployAPI = function(nfx, options) {
  return new Promise((resolve, reject) => {
    nfx.state = 'DEPLOYING';
    setDeployment(nfx, options.rollback);

    const req = nfx.awsSDK.cf.updateStack({
      StackName: nfx.stackName,
      TemplateBody: JSON.stringify(nfx.cfTemplate, null, 2),
      Capabilities: ['CAPABILITY_IAM']
    });

    req.on('success', function(resp) {
      log.info(`Updating stack with new deployment ${nfx.version}...`);
      nfx.awsSDK.cf.waitFor('stackUpdateComplete',
        { StackName: nfx.stackName },
        function(err, data) {
          if (err) {
            reject(err);
            return;
          }

          nfx.nfxJSON.active_version = nfx.version;

          log.info('Successfully deployed.');
          resolve(nfx);
        }
      );
    });

    req.on('error', function(err, data) {
      if (err.message && err.message.indexOf('No updates are to be performed') !== -1) {
        log.info("No updates on deployment. Proceed to the next step");
        resolve(nfx);
      } else {
        reject(err);
      }
    });

    req.send();
  });
}

function setDeployment(nfx, rollback) {
  let cfDeploymentContent = fsReadFile(path.join(__dirname, 'cf-deployment.json'));

  cfDeploymentContent = cfDeploymentContent.replace('$STAGE_NAME', nfx.stage);
  const cfDeploymentJSON = JSON.parse(cfDeploymentContent);
  let deploymentResourceName = `NFXDeployment${nfx.version}`;
  if (rollback) {
    // If we don't create new deployment tag with new name,
    // it will not deploy since there is no changes on deployment tag.
    deploymentResourceName = `${deploymentResourceName}Rollback`;
  }
  nfx.cfTemplate.Resources[deploymentResourceName] = JSON.parse(cfDeploymentContent);

  let cfBaseURLOutputContent = fsReadFile(path.join(__dirname, 'cf-api-base-url-output.json'));
  cfBaseURLOutputContent = cfBaseURLOutputContent.replace('$STAGE_NAME', nfx.stage);
  nfx.cfTemplate.Outputs.NFXBaseURL = JSON.parse(cfBaseURLOutputContent);
}
