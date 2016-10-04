'use strict';

const consoleLog = require('../utils/consoleLog').consoleLog;

module.exports.getStackTemplate = function(nfx) {
  return new Promise((resolve, reject) => {
    nfx.awsSDK.cf.getTemplate(
      { StackName: nfx.stackName },
      function(err, data) {
        if (err) {
          reject(err);
        }
        consoleLog('info', `Successfully fetched the template`);
        nfx.cfTemplate = JSON.parse(data.TemplateBody);
        resolve(nfx);
      }
    );
  });
}
