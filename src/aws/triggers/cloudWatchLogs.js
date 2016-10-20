'use strict';

const fsReadFile = require('../../utils/fs').fsReadFile,
      path       = require('path'),
      crypto     = require('crypto');

module.exports = function getResources(trigger, funcName, region) {
  if (!trigger.log_group_name) {
    throw new Error('log_group_name is required for CloudWatch Logs triggers');
  }
  if (!trigger.filter_pattern) {
    throw new Error('filter_pattern is required for CloudWatch Logs triggers');
  }

  const resources = {};
  const cfTriggerContent = fsReadFile(path.join(__dirname, 'cf-trigger-cloudwatch-log.json'));
  const cfFuncPermissionContent = fsReadFile(path.join(__dirname, 'cf-trigger-lambda-permission.json'));
  const groupNameHash = crypto.createHash('sha1').update(trigger.log_group_name).digest('hex');
  const resourceName = `NFX${funcName}${groupNameHash}CloudWatchLogSubscriptionFilter`;
  const permissionResourceName = `${resourceName}TriggerLambdaPermission`;

  resources[resourceName] = JSON.parse(
    cfTriggerContent
      .replace('$LOG_GROUP_NAME', trigger.log_group_name)
      .replace('$FILTER_PATTERN', trigger.filter_pattern)
      .replace('$FUNCTION_NAME', funcName)
      .replace('$TRIGGER_PERMISSION', permissionResourceName)
  );

  resources[permissionResourceName] = JSON.parse(
    cfFuncPermissionContent
      .replace('$FUNCTION_NAME', funcName)
      .replace('$PRINCIPAL', `logs.${region}.amazonaws.com`)
  );

  return resources;
};
