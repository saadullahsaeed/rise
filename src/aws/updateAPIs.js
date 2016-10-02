'use strict';

const fs         = require('fs'),
      path       = require('path'),
      AWS        = require('aws-sdk'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      loadYAML   = require('../utils/yaml').loadYAML;

module.exports.updateAPIs = function(cf, stackName, cfTemplate) {
  return new Promise((resolve, reject) => {
    const version = '0.0.2' // FIXME: hardcode it for now.
    let cfRestAPIContent = fsReadFile(path.join(__dirname, 'cf-restapi.json'));

    const s3Key = 'api-' + version + '.yaml';
    cfRestAPIContent = cfRestAPIContent.replace('$S3KEY', s3Key);
    const cfRestAPIJSON = JSON.parse(cfRestAPIContent);
    cfTemplate.Resources.NFXApi = cfRestAPIJSON;

    const req = cf.updateStack({
      StackName: stackName,
      TemplateBody: JSON.stringify(cfTemplate),
      Capabilities: ['CAPABILITY_IAM'],
    });

    consoleLog('info', 'Updating api template...');
    req.on('success', function(resp) {
      consoleLog('info', `Deploying functions...`);
      cf.waitFor('stackUpdateComplete', { StackName: stackName }, function(err, data) {
        if (err) {
          reject(err);
          return;
        }

        consoleLog('info', "Successfully updated API.");
        resolve(cfTemplate);
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
