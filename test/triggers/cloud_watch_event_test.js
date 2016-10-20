'use strict';

const getResources = require('../../src/aws/triggers/cloudWatchEvent');

const crypto = require('crypto');

describe('CloudWatch Event trigger getResources', function() {
  const funcName = 'AppHelloIndex';

  context('with a basic trigger config', function() {
    const trigger = {
      schedule_expression: 'rate(5 minutes)'
    };

    it('includes the SHA-1 hash of the schedule expression in the resource name', function() {
      const resources = getResources(trigger, funcName);

      const sha = crypto.createHash('sha1').update('rate(5 minutes)').digest('hex');

      const expectedName = `NFXAppHelloIndex${sha}CloudWatchEventRule`;
      expect(resources).to.have.property(expectedName);
    });

    it('returns a CloudWatch Event rule resource', function() {
      const resources = getResources(trigger, funcName);

      const sha = crypto.createHash('sha1').update('rate(5 minutes)').digest('hex');
      const expectedName = `NFXAppHelloIndex${sha}CloudWatchEventRule`;

      const ruleResource = resources[expectedName];
      expect(ruleResource).to.deep.equal({
        Type: 'AWS::Events::Rule',
        Properties: {
          ScheduleExpression: 'rate(5 minutes)',
          State: 'ENABLED',
          Targets: [{
            Arn: { 'Fn::GetAtt': [funcName, 'Arn'] },
            Id: 'AppHelloIndexSchedule'
          }]
        }
      });
    });

    it('returns a permission resource', function() {
      const resources = getResources(trigger, funcName);

      const sha = crypto.createHash('sha1').update('rate(5 minutes)').digest('hex');
      const ruleResourceName = `NFXAppHelloIndex${sha}CloudWatchEventRule`;
      const permissionName = `NFXAppHelloIndex${sha}CloudWatchEventRuleTriggerLambdaPermission`;

      const permissionResource = resources[permissionName];
      expect(permissionResource).to.deep.equal({
        Type: 'AWS::Lambda::Permission',
        Properties: {
          FunctionName: { 'Fn::GetAtt': [ funcName, 'Arn' ] },
          Action: 'lambda:InvokeFunction',
          Principal: 'events.amazonaws.com',
          SourceArn: { 'Fn::GetAtt': [ ruleResourceName, 'Arn' ] }
        }
      });
    });
  });

  context('when schedule_expression is not specified', function() {
    const trigger = {};

    it('throws an error', function() {
      expect(function() {
        getResources(trigger, funcName);
      }).to.throw(Error, 'schedule_expression is required for CloudWatch Event triggers');
    });
  });
});
