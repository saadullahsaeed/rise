'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports.deployFunctions = function(nfx) {
  return new Promise((resolve, reject) => {
    const cfFunctionContent = fsReadFile(path.join(__dirname, 'cf-lambda-function.json'));
    const cfFunctionVersionContent = fsReadFile(path.join(__dirname, 'cf-lambda-version.json'));
    const cfFunctionArnOutputContent = fsReadFile(path.join(__dirname, 'cf-lambda-arn-output.json'));

    const defaultSetting = nfx.functions.default;
    for (let funcPath in nfx.functions) {
      if (funcPath === 'default') {
        continue;
      }

      const func = nfx.functions[funcPath];
      const funcName = funcPath.replace(path.sep, '');
      const s3Key = `versions/${nfx.version}/functions/${funcName}.zip`;
      const timeout = func.timeout || defaultSetting.timeout;
      const memorySize = func.memory || defaultSetting.memory;

      nfx.cfTemplate.Resources[funcName] = JSON.parse(
        cfFunctionContent
          .replace('$HANDLER', func.handler)
          .replace('$S3BUCKET', nfx.bucketName)
          .replace('$S3KEY', s3Key)
          .replace('$TIMEOUT', timeout)
          .replace('$MEMORY_SIZE', memorySize)
      );

      nfx.cfTemplate.Outputs[funcName] = JSON.parse(
        cfFunctionArnOutputContent.replace('$FUNCTION_NAME', funcName)
      );
    }

    const req = nfx.awsSDK.cf.updateStack({
      StackName: nfx.stackName,
      TemplateBody: JSON.stringify(nfx.cfTemplate, null, 2),
      Capabilities: ['CAPABILITY_IAM']
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
          nfx.lambdaARNs = data.Stacks[0].Outputs;
          resolve(nfx);
        }
      );
    });

    req.on('error', function(err, data) {
      if (err.message && err.message.indexOf('No updates are to be performed') !== -1) {
        consoleLog('info', "No updates on lambda functions. Proceed to the next step");
        resolve(nfx);
      } else {
        reject(err);
      }
    });

    req.send();
  });
}
