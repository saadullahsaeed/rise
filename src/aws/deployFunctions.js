'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports.deployFunctions = function(nfx) {
  return new Promise((resolve, reject) => {
    const cfBaseContent = fsReadFile(path.join(__dirname, 'cf-base.json'));
    const cfBaseContentJSON = JSON.parse(cfBaseContent);
    const cfFunctionContent = fsReadFile(path.join(__dirname, 'cf-lambda-function.json'));
    const cfFunctionVersionContent = fsReadFile(path.join(__dirname, 'cf-lambda-version.json'));
    const cfFunctionArnOutputContent = fsReadFile(path.join(__dirname, 'cf-lambda-arn-output.json'));

    for (let funcPath in nfx.functions) {
      if (funcPath === 'default') {
        continue;
      }

      const func = nfx.functions[funcPath];
      const funcName = funcPath.replace(path.sep, '');
      const s3Key = funcName + '-' + nfx.version + '.zip';

      cfBaseContentJSON.Resources[funcName] = JSON.parse(cfFunctionContent
                  .replace('$HANDLER', func.handler)
                  .replace('$S3KEY', s3Key)
                  .replace('$TIMEOUT', func.timeout));

      // FIXME: VERSION is not update, update ${funcName}Version to create a new version
      cfBaseContentJSON.Resources[`${funcName}Version`] = JSON.parse(cfFunctionVersionContent.replace('$FUNCTION_NAME', funcName));
      cfBaseContentJSON.Outputs[funcName] = JSON.parse(cfFunctionArnOutputContent.replace('$FUNCTION_NAME', funcName));
    }

    const req = nfx.awsSDK.cf.updateStack({
      StackName: nfx.stackName,
      TemplateBody: JSON.stringify(cfBaseContentJSON),
      Capabilities: ['CAPABILITY_IAM'],
    });

    req.on('success', function(resp) {
      consoleLog('info', `Deploying functions...`);
      nfx.awsSDK.cf.waitFor('stackUpdateComplete',
        { StackName: nfx.stackName },
        function(err, data) {
        if (err) {
          reject(err);
          return;
        }

        consoleLog('info', `Successfully deployed functions.`);
        nfx.cfTemplate = cfBaseContentJSON;
        nfx.lambdaARNs = data.Stacks[0].Outputs;
        resolve(nfx);
      });
    });

    req.on('error', function(err, data) {
      reject(err.message);
    });

    req.send();
  });
}
