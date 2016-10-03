'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      yaml       = require('js-yaml');

module.exports.uploadAPITemplate = function(nfx) {
  return new Promise((resolve, reject) => {
    const lambdaARNMap = {};

    for ( let i = 0; i < nfx.lambdaARNs.length; ++i ) {
      const lambdaARN = nfx.lambdaARNs[i];
      lambdaARNMap[lambdaARN.OutputKey] = lambdaARN.OutputValue;
    }

    let cfAPI = nfx.api;
    cfAPI.info = {
      title: nfx.stackName,
      description: nfx.stackName + " nfx serverless app project",
      version: nfx.version
    }

    for ( let p in cfAPI.paths ) {
      const urlPath = cfAPI.paths[p];
      for ( let m in urlPath ) {
        const method = urlPath[m];
        const funcName = method['x-nfx'].handler.replace(path.sep, '');
        method["x-amazon-apigateway-integration"].uri = lambdaARNMap[funcName];
      }
    }

    const s3Key = 'api-' + nfx.version + '.yaml';
    const params = {
      Bucket: nfx.bucketName,
      Key: s3Key,
      ACL: 'private',
      Body: yaml.safeDump(cfAPI),
      ContentType: 'text/yaml'
    };

    consoleLog('info', 'Uploading api template...');
    nfx.awsSDK.s3.upload(params, function(err, data) {
      if (err) {
        consoleLog('err', `Error on uploading function ${err}`);
        reject(err);
      }

      consoleLog('info', `Successfully uploaded ${s3Key}`);
      resolve(nfx);
    });
  });
}
