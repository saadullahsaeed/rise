'use strict';

const fsReadFile = require('../../utils/fs').fsReadFile,
      path       = require('path');

module.exports = function getResources(trigger, funcName, roleResource) {
  if (!trigger.arn) {
    throw new Error('arn is required for stream triggers');
  }
  if (!trigger.starting_position) {
    throw new Error('starting_position is required for stream triggers');
  }


  const resources = {};
  const cfTriggerContent = fsReadFile(path.join(__dirname, 'cf-trigger-stream.json'));
  const streamType = trigger.arn.split(':')[2];
  const streamName = trigger.arn.split('/')[1].replace(/[^0-9a-z]/gi, '');
  const resourceName = `NFX${funcName}${streamType}${streamName}EventSourceMapping`;

  if (!roleResource.Properties) {
    roleResource.Properties = {};
  }
  if (!roleResource.Properties.Policies) {
    roleResource.Properties.Policies = [];
  }

  if (streamType === 'dynamodb') {
    roleResource.Properties.Policies.push(
      {
        PolicyName: `${resourceName}-access`,
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
        PolicyName: `${resourceName}-access`,
        PolicyDocument: {
          Version : "2012-10-17",
          Statement: [{
            Effect: "Allow",
            Action: [
              "kinesis:GetShardIterator",
              "kinesis:DescribeStream"
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
      .replace('$STARTING_POSITION', trigger.starting_position)
  );

  if (trigger.batch_size) {
    resources[resourceName].Properties.BatchSize = trigger.batch_size;
  }

  // TODO Don't hardcode role resource name.
  resources['NFXRole'] = roleResource;

  return resources;
};
