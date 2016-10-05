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
        const templateBodyJSON = JSON.parse(data.TemplateBody);
        nfx.cfTemplate.Resources = Object.assign({}, templateBodyJSON.Resources, nfx.cfTemplate.Resources);
        nfx.cfTemplate.Outputs = Object.assign({}, templateBodyJSON.Outputs, nfx.cfTemplate.Outputs);
        resolve(nfx);
      }
    );
  });
}
