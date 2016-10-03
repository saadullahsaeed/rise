'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      loadYAML   = require('../utils/yaml').loadYAML;

module.exports.updateAPIs = function(nfx) {
  return new Promise((resolve, reject) => {
    let cfRestAPIContent = fsReadFile(path.join(__dirname, 'cf-restapi.json'));

    const s3Key = 'api-' + nfx.version + '.yaml';
    cfRestAPIContent = cfRestAPIContent.replace('$S3KEY', s3Key);
    const cfRestAPIJSON = JSON.parse(cfRestAPIContent);
    nfx.cfTemplate.Resources.NFXApi = cfRestAPIJSON;

    const req = nfx.awsSDK.cf.updateStack({
      StackName: nfx.stackName,
      TemplateBody: JSON.stringify(nfx.cfTemplate),
      Capabilities: ['CAPABILITY_IAM'],
    });

    consoleLog('info', 'Updating api template...');
    req.on('success', function(resp) {
      consoleLog('info', `Deploying functions...`);
      nfx.awsSDK.cf.waitFor('stackUpdateComplete',
        { StackName: nfx.stackName },
        function(err, data) {
        if (err) {
          reject(err);
          return;
        }

        consoleLog('info', "Successfully updated API.");
        resolve(nfx);
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
