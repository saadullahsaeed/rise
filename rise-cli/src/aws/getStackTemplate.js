'use strict';

const log = require('../utils/log');

module.exports = function getStackTemplate(session) {
  return session.aws.cf.getTemplate(
    { StackName: session.stackName }).promise()
      .then(function(data) {
        log.info(`Successfully fetched the template`);
        session.aws.cfTemplate = JSON.parse(data.TemplateBody);
        return Promise.resolve(session);
      });
};
