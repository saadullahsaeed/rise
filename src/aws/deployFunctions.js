'use strict';

const fs         = require('fs'),
      path       = require('path'),
      ConsoleLog = require('../utils/consoleLog').ConsoleLog;

module.exports.DeployFunctions = function(cf, stackName, functions) {
  return new Promise((resolve, reject) => {
    const cfBaseContent = fsReadFile(path.join(__dirname, 'cf-base.json'));
    const cfBaseContentJSON = JSON.parse(cfBaseContent);
    const cfFunctionContent = fsReadFile(path.join(__dirname, 'cf-lambda-function.json'));
    const cfFunctionJSON = JSON.parse(cfFunctionContent);
    const cfFunctionVersionContent = fsReadFile(path.join(__dirname, 'cf-lambda-version.json'));
    const cfFunctionVersionJSON = JSON.parse(cfFunctionVersionContent);

    const funcPaths = Object.keys(functions);
    const version = '0.0.2' // FIXME: hardcode it for now.
    for ( var i = 0; i < funcPaths.length; i++) {
      const funcPath = funcPaths[i];
      const funcName = path.basename(funcPath);
      const s3Key = funcName + '-' + version + '.zip';
      const func = functions[funcPath];

      if (funcPath === 'default') {
        continue;
      }

      let cfFunctionString = JSON.stringify(cfFunctionJSON);
      cfFunctionString = cfFunctionString.replace('$HANDLER', func.handler);
      cfFunctionString = cfFunctionString.replace('$S3KEY', s3Key);
      cfFunctionString = cfFunctionString.replace('$TIMEOUT', func.timeout);
      cfBaseContentJSON.Resources[funcName] = JSON.parse(cfFunctionString);

      // FIXME: VERSION is not update, update ${funcName}Version to create a new version
      let cfFunctionVersionString = JSON.stringify(cfFunctionVersionJSON);
      cfFunctionVersionString = cfFunctionVersionString.replace('$FUNCTION_NAME', funcName);
      cfBaseContentJSON.Resources[`${funcName}Version`] = JSON.parse(cfFunctionVersionString);

      // FIXME: I think we don't need output for lambda function. API Gateway output is more useful
      // comment it for now. remove it if you agree this is not useful.
      //tmpl.Outputs[funcName] = {
        //Value: {
          //"Fn::Join": [
            //"",
            //[
              //"arn:aws:apigateway:",
              //{
                //"Ref": "AWS::Region"
              //},
              //":lambda:path/2015-03-31/functions/",
              //{
                //"Fn::GetAtt": [
                  //funcName,
                  //"Arn"
                //]
              //},
              //"/invocations"
            //]
          //]
        //}
      //};
    }

    const req = cf.updateStack({
      StackName: stackName,
      TemplateBody: JSON.stringify(cfBaseContentJSON),
      Capabilities: ['CAPABILITY_IAM'],
    });

    req.on('success', function(resp) {
      ConsoleLog('info', `Deploying functions...`);
      cf.waitFor('stackUpdateComplete', { StackName: stackName }, function(err, data) {
        if (err) {
          reject(err);
        }

        ConsoleLog('info', `Successfully deployed functions.`);
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
    return fs.readFileSync(path);
  } catch (err) {
    return false;
  }
}
