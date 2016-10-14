'use strict';

const log = require('../utils/log');

module.exports.getStackTemplate = function(nfx) {
  return new Promise((resolve, reject) => {
    nfx.awsSDK.cf.getTemplate(
      { StackName: nfx.stackName },
      function(err, data) {
        if (err) {
          reject(err);
        }
        log.info(`Successfully fetched the template`);
        nfx.cfTemplate = JSON.parse(data.TemplateBody);
        resolve(nfx);
      }
    );
  });
}
