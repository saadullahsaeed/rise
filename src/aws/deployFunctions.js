'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog;

module.exports.deployFunctions = function(nfx) {
  return new Promise((resolve, reject) => {
    const cfBaseContent = fsReadFile(path.join(__dirname, 'cf-base.json'));
    const cfBaseContentJSON = JSON.parse(cfBaseContent);
    let cfFunctionContent = fsReadFile(path.join(__dirname, 'cf-lambda-function.json'));
    let cfFunctionVersionContent = fsReadFile(path.join(__dirname, 'cf-lambda-version.json'));
    let cfFunctionArnOutputContent = fsReadFile(path.join(__dirname, 'cf-lambda-arn-output.json'));

    for (let funcPath in nfx.functions) {
      if (funcPath === 'default') {
        continue;
      }

      const func = nfx.functions[funcPath];
      const funcName = funcPath.replace(path.sep, '');
      const s3Key = funcName + '-' + nfx.version + '.zip';

      cfFunctionContent = cfFunctionContent.replace('$HANDLER', func.handler);
      cfFunctionContent = cfFunctionContent.replace('$S3KEY', s3Key);
      cfFunctionContent = cfFunctionContent.replace('$TIMEOUT', func.timeout);
      cfBaseContentJSON.Resources[funcName] = JSON.parse(cfFunctionContent);

      // FIXME: VERSION is not update, update ${funcName}Version to create a new version
      cfFunctionVersionContent = cfFunctionVersionContent.replace('$FUNCTION_NAME', funcName);
      cfBaseContentJSON.Resources[`${funcName}Version`] = JSON.parse(cfFunctionVersionContent);

      cfFunctionArnOutputContent = cfFunctionArnOutputContent.replace('$FUNCTION_NAME', funcName);
      cfBaseContentJSON.Outputs[funcName] = JSON.parse(cfFunctionArnOutputContent);
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

function fsReadFile(path) {
  try {
    return fs.readFileSync(path, { encoding: 'utf8' });
  } catch (err) {
    return false;
  }
}
