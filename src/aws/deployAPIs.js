'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      LoadYAML   = require('../utils/yaml').LoadYAML,
      YAML       = require('js-yaml');

module.exports.deployAPIs = function(nfx, cfTemplate) {
  return new Promise((resolve, reject) => {
    const version = '0.0.2' // FIXME: hardcode it for now.
    let cfDeploymentContent = fsReadFile(path.join(__dirname, 'cf-deployment.json'));

    cfDeploymentContent = cfDeploymentContent.replace('$STAGE_NAME', 'staging');
    const cfDeploymentJSON = JSON.parse(cfDeploymentContent);

    console.log(cfTemplate);
    cfTemplate.Resources.NFXDeployment = cfDeploymentJSON;

    const req = nfx.awsSDK.cf.updateStack({
      StackName: nfx.stackName,
      TemplateBody: JSON.stringify(cfTemplate),
      Capabilities: ['CAPABILITY_IAM'],
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
    return fs.readFileSync(path, { encoding: 'utf8' });
  } catch (err) {
    return false;
  }
}
