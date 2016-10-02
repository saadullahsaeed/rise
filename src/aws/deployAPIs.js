'use strict';

const fs         = require('fs'),
      path       = require('path'),
      AWS        = require('aws-sdk'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      LoadYAML   = require('../utils/yaml').LoadYAML,
      YAML       = require('js-yaml');

module.exports.deployAPIs = function(cf, stackName, cfTemplate) {
  return new Promise((resolve, reject) => {
    const version = '0.0.2' // FIXME: hardcode it for now.
    let cfDeploymentContent = fsReadFile(path.join(__dirname, 'cf-deployment.json'));

    cfDeploymentContent = cfDeploymentContent.replace('$STAGENAME', 'staging');
    const cfDeploymentJSON = JSON.parse(cfDeploymentContent);

    console.log(cfTemplate);
    cfTemplate.Resources.NFXDeployment = cfDeploymentJSON;

    const req = cf.updateStack({
      StackName: stackName,
      TemplateBody: JSON.stringify(cfTemplate),
      Capabilities: ['CAPABILITY_IAM'],
    });

    req.on('success', function(resp) {
      consoleLog('info', `Deploying API...`);
      cf.waitFor('stackUpdateComplete', { StackName: stackName }, function(err, data) {
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
