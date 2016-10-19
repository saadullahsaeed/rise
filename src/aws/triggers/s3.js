'use strict';

const fsReadFile = require('../../utils/fs').fsReadFile,
      path       = require('path');

module.exports = function getResources(trigger, funcName) {
  const resources = {};
  const cfTriggerContent = fsReadFile(path.join(__dirname, 'cf-trigger-s3.json'));
  const cfFuncPermissionContent = fsReadFile(path.join(__dirname, 'cf-trigger-lambda-permission.json'));
  const resourceName = `NFX${trigger.bucket.replace(/[^0-9a-z]/gi, '')}Bucket`;
  const permissionResourceName = `${funcName}${trigger.bucket.replace(/[^0-9a-z]/gi, '')}S3TriggerLambdaPermission`;

  resources[resourceName] = JSON.parse(
    cfTriggerContent
      .replace('$BUCKET_NAME', trigger.bucket)
      .replace('$EVENT', trigger.event)
      .replace('$S3_TRIGGER_PERMISSION', permissionResourceName)
      .replace('$FUNCTION_NAME', funcName)
  );

  if (trigger.prefix || trigger.suffix) {
    resources[resourceName].Properties.NotificationConfiguration.LambdaConfigurations[0].Filter = { S3Key: { Rules: [] } }
    if (trigger.prefix) {
      resources[resourceName].Properties.NotificationConfiguration.LambdaConfigurations[0].Filter.S3Key.Rules.push({ Name: 'prefix', Value: trigger.prefix })
    }
    if (trigger.suffix) {
      resources[resourceName].Properties.NotificationConfiguration.LambdaConfigurations[0].Filter.S3Key.Rules.push({ Name: 'suffix', Value: trigger.suffix })
    }
  }

  resources[permissionResourceName] = JSON.parse(
    cfFuncPermissionContent
      .replace('$FUNCTION_NAME', funcName)
      .replace('$PRINCIPAL', "s3.amazonaws.com")
  );

  resources[permissionResourceName].Properties.SourceArn = `arn:aws:s3:::${trigger.bucket}`;

  return resources;
}
