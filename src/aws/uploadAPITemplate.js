'use strict';

const fs         = require('fs'),
      path       = require('path'),
      AWS        = require('aws-sdk'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      loadYAML   = require('../utils/yaml').loadYAML,
      yaml       = require('js-yaml');

module.exports.uploadAPITemplate = function(cfTemplate, bucketName, lambdaARNs) {
  return new Promise((resolve, reject) => {
    const version = '0.0.2' // FIXME: hardcode it for now.
    const lambdaARNMap = {};

    console.log('bucketName3', bucketName);

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
    const s3 = new AWS.S3();
    const params = {
      Bucket: bucketName,
      Key: s3Key,
      ACL: 'private',
      Body: yaml.safeDump(cfAPI),
      ContentType: 'text/yaml'
    };

    consoleLog('info', 'Uploading api template...');
    s3.upload(params, function(err, data) {
      if (err) {
        consoleLog('err', `Error on uploading function ${err}`);
        reject(err);
      }

      consoleLog('info', `Successfully uploaded ${s3Key}`);
      resolve(cfTemplate, bucketName);
    });
  });
}
