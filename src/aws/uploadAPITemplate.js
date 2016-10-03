'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      loadYAML   = require('../utils/yaml').loadYAML,
      yaml       = require('js-yaml');

module.exports.uploadAPITemplate = function(nfx, cfTemplate, lambdaARNs) {
  return new Promise((resolve, reject) => {
    const version = '0.0.2' // FIXME: hardcode it for now.
    const lambdaARNMap = {};

    console.log('bucketName', nfx.bucketName);

    for ( let i = 0; i < lambdaARNs.length; ++i ) {
      const lambdaARN = lambdaARNs[i];
      lambdaARNMap[lambdaARN.OutputKey] = lambdaARN.OutputValue;
    }

    console.log('lambdaARNMap', lambdaARNMap);

    let cfAPI = loadYAML('api.yaml');
    for ( let p in cfAPI.paths ) {
      const urlPath = cfAPI.paths[p];
      for ( let m in urlPath ) {
        const method = urlPath[m];
        const funcName = method['x-nfx'].handler.replace(path.sep, '');
        method["x-amazon-apigateway-integration"].uri = lambdaARNMap[funcName];
      }
    }

    console.log(cfAPI);

    const s3Key = 'api-' + version + '.yaml';
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
      resolve(cfTemplate);
    });
  });
}
