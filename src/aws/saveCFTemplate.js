'use strict';

const consoleLog = require('../utils/consoleLog').consoleLog;

module.exports.saveCFTemplate = function(nfx) {
  return new Promise((resolve, reject) => {
    const s3Key = `versions/${nfx.version}.json`;
    const params = {
      Bucket: nfx.bucketName,
      Key: s3Key,
      ACL: 'private',
      Body: JSON.stringify(nfx.cfTemplate, null, 2),
      ContentType: 'application/json'
    };

    consoleLog('info', 'Save Cloudformation template...');
    nfx.awsSDK.s3.upload(params, function(err, data) {
      if (err) {
        consoleLog('err', `Error on saving template ${err}`);
        reject(err);
      }

      consoleLog('info', `Successfully saved ${s3Key}`);
      resolve(nfx);
    });
  });
}
