'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      loadYAML   = require('../utils/yaml').loadYAML,
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports.updateAPIs = function(nfx) {
  return new Promise((resolve, reject) => {
    let cfRestAPIContent = fsReadFile(path.join(__dirname, 'cf-restapi.json'));

    const s3Key = `versions/${nfx.version}/aws/swagger.yaml`;
    const cfRestAPIJSON = JSON.parse(
      cfRestAPIContent.replace('$S3KEY', s3Key)
    );
    nfx.cfTemplate.Resources.NFXApi = cfRestAPIJSON;

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

    const req = nfx.awsSDK.cf.updateStack({
      StackName: nfx.stackName,
      TemplateBody: JSON.stringify(nfx.cfTemplate, null, 2),
      Capabilities: ['CAPABILITY_IAM']
    });

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
      if (err.message && err.message.indexOf('No updates are to be performed') !== -1) {
        consoleLog('info', "No updates on API. Proceed to the next step");
        resolve(nfx);
      }
      reject(err);
    });

    req.send();
  });
}
