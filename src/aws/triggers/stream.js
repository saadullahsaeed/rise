'use strict';

const fsReadFile = require('../../utils/fs').fsReadFile,
      path       = require('path');

module.exports = function getResources(trigger, funcName, roleResource) {
  const resources = {};
  const cfTriggerContent = fsReadFile(path.join(__dirname, 'cf-trigger-stream.json'));
  const streamType = trigger.arn.split(':')[2];
  const streamName = trigger.arn.split('/')[1].replace(/[^0-9a-z]/gi, '');
  const resourceName = `NFX${funcName}${streamType}${streamName}EventSourceMapping`;

  if (!roleResource.Properties.Policies) {
    roleResource.Properties.Policies = [];
  }

  if (streamType === 'dynamodb') {
    roleResource.Properties.Policies.push(
      {
        PolicyName: "dynamodb-stream-access",
        PolicyDocument: {
          Version : "2012-10-17",
          Statement: [{
            Effect: "Allow",
            Action: [
              "dynamodb:GetShardIterator",
              "dynamodb:DescribeStream"
            ],
            Resource: trigger.arn
          }, {
            Effect: "Allow",
            Action: [
              "dynamodb:GetRecords",
              "dynamodb:ListStreams"
            ],
            Resource: "*"
          }]
        }
      }
    );
  } else if (streamType === 'kinesis') {
    roleResource.Properties.Policies.push(
      {
        PolicyName: "kinesis-stream-access",
        PolicyDocument: {
          Version : "2012-10-17",
          Statement: [{
            Effect: "Allow",
            Action: [
              "kinesis:DescribeStream",
              "kinesis:GetShardIterator"
            ],
            Resource: trigger.arn
          }, {
            Effect: "Allow",
            Action: [
              "kinesis:GetRecords",
              "kinesis:ListStreams"
            ],
            Resource: "*"
          }]
        }
      }
    );
  }

  resources[resourceName] = JSON.parse(
    cfTriggerContent
      .replace('$FUNCTION_NAME', funcName)
      .replace('$EVENT_SOURCE_ARN', trigger.arn)
  );

  if (trigger.batch_size) {
    resources[resourceName].Properties.BatchSize = trigger.batch_size;
  }

  if (trigger.starting_position) {
    resources[resourceName].Properties.StartingPosition = trigger.starting_position;
  }

  resources['NFXRole'] = roleResource;

  return resources;
};
