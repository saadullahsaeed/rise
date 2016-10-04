'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      loadYAML   = require('../utils/yaml').loadYAML,
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports.updateAPIs = function(nfx) {
  return new Promise((resolve, reject) => {
    let cfRestAPIContent = fsReadFile(path.join(__dirname, 'cf-restapi.json'));

    const s3Key = 'api-' + nfx.version + '.yaml';
    cfRestAPIContent = cfRestAPIContent.replace('$S3KEY', s3Key);
    const cfRestAPIJSON = JSON.parse(cfRestAPIContent);
    nfx.cfTemplate.Resources.NFXApi = cfRestAPIJSON;

    const req = nfx.awsSDK.cf.updateStack({
      StackName: nfx.stackName,
      TemplateBody: JSON.stringify(nfx.cfTemplate, null, 2),
      Capabilities: ['CAPABILITY_IAM'],
    });


    for (let funcPath in nfx.functions) {
      if (funcPath === 'default') {
        continue;
      }

      const func = nfx.functions[funcPath];
      const funcName = funcPath.replace(path.sep, '');

      let cfFuncRoleContent = fsReadFile(path.join(__dirname, 'cf-lambda-role.json'));
      cfFuncRoleContent = cfFuncRoleContent.replace('$FUNCTION_NAME', funcName);
      const cfFuncRoleJSON = JSON.parse(cfFuncRoleContent);
      nfx.cfTemplate.Resources[`${funcName}Role`] = cfFuncRoleJSON;
    }

    consoleLog('info', 'Updating api template...');
    req.on('success', function(resp) {
      consoleLog('info', `Made a request to updating api template...`);
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
