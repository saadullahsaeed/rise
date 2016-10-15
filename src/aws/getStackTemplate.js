'use strict';

const log = require('../utils/log');

module.exports = function getStackTemplate(nfx) {
  return nfx.aws.cf.getTemplate(
    { StackName: nfx.stackName }).promise()
      .then(function(data) {
        log.info(`Successfully fetched the template`);
        nfx.cfTemplate = JSON.parse(data.TemplateBody);
        return Promise.resolve(nfx);
      });
};
