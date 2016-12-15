'use strict';

const fsReadFile = require('../../utils/fs').fsReadFile,
      path       = require('path'),
      crypto     = require('crypto');

module.exports = function getResources(trigger, funcName) {
  if (!trigger.schedule_expression) {
    throw new Error('schedule_expression is required for CloudWatch Event triggers');
  }

  const resources = {};
  const cfTriggerContent = fsReadFile(path.join(__dirname, 'cf-trigger-cloudwatch-event.json'));
  const cfFuncPermissionContent = fsReadFile(path.join(__dirname, 'cf-trigger-lambda-permission.json'));
  const expressionHash = crypto.createHash('sha1').update(trigger.schedule_expression).digest('hex');
  const resourceName = `NFX${funcName}${expressionHash}CloudWatchEventRule`;
  const cloudWatchPermissionName = `${resourceName}TriggerLambdaPermission`;

  resources[resourceName] = JSON.parse(
    cfTriggerContent
      .replace('$EXPRESSION', trigger.schedule_expression)
      .replace('$FUNCTION_NAME', funcName)
      .replace('$TARGET_ID', `${funcName}Schedule`)
  );

  resources[cloudWatchPermissionName] = JSON.parse(
    cfFuncPermissionContent
      .replace('$FUNCTION_NAME', funcName)
      .replace('$PRINCIPAL', "events.amazonaws.com")
  );

  resources[cloudWatchPermissionName].Properties.SourceArn = {
    "Fn::GetAtt": [resourceName, "Arn"]
  };

  return resources;
};
