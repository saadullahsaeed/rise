'use strict';

const fsReadFile = require('../../utils/fs').fsReadFile,
      path       = require('path');

module.exports = function getResources(trigger, funcName) {
  if (!trigger.topic_name) {
    throw new Error('topic_name is required for SNS topic triggers');
  }

  const resources = {};
  const cfTriggerContent = fsReadFile(path.join(__dirname, 'cf-trigger-sns.json'));
  const cfFuncPermissionContent = fsReadFile(path.join(__dirname, 'cf-trigger-lambda-permission.json'));
  const resourceName = `NFX${trigger.topic_name.replace(/[^0-9a-z]/gi, '')}SNS`;
  const permissionResourceName = `${resourceName}TriggerLambdaPermission`;

  resources[resourceName] = JSON.parse(
    cfTriggerContent
      .replace('$TOPIC_NAME', trigger.topic_name)
      .replace('$FUNCTION_NAME', funcName)
  );

  if (trigger.display_name) {
    resources[resourceName].Properties.DisplayName = trigger.display_name;
  }

  resources[permissionResourceName] = JSON.parse(
    cfFuncPermissionContent
      .replace('$FUNCTION_NAME', funcName)
      .replace('$PRINCIPAL', "sns.amazonaws.com")
  );

  return resources;
};
