'use strict';

const getResources = require('../../src/aws/triggers/cloudWatchLogs');

const crypto = require('crypto');

describe('CloudWatch Logs trigger getResources', function() {
  const funcName = 'AppHelloIndex',
        region = 'ap-southeast-1';

  context('with a basic trigger config', function() {
    const trigger = {
      log_group_name: 'test-log-group',
      filter_pattern: '{$.userIdentity.type = Root}'
    };

    it('returns a SubscriptionFilter resource and a permission resource', function() {
      const resources = getResources(trigger, funcName, region);

      const sha = crypto.createHash('sha1').update('test-log-group').digest('hex');
      const resourceName = `RiseAppHelloIndex${sha}CloudWatchLogSubscriptionFilter`;
      const permissionName = `RiseAppHelloIndex${sha}CloudWatchLogSubscriptionFilterTriggerLambdaPermission`;

      expect(resources).to.have.property(resourceName);
      expect(resources).to.have.property(permissionName);

      expect(resources[resourceName]).to.deep.equal({
        Type: 'AWS::Logs::SubscriptionFilter',
        DependsOn: permissionName,
        Properties: {
          LogGroupName: 'test-log-group',
          FilterPattern: '{$.userIdentity.type = Root}',
          DestinationArn: { 'Fn::GetAtt': [ funcName, 'Arn' ] }
        }
      });

      expect(resources[permissionName]).to.deep.equal({
        Type: 'AWS::Lambda::Permission',
        Properties: {
          FunctionName: { 'Fn::GetAtt': [ funcName, 'Arn' ] },
          Action: 'lambda:InvokeFunction',
          Principal: 'logs.ap-southeast-1.amazonaws.com'
        }
      });
    });
  });

  context('when log_group_name is not specified', function() {
    const trigger = {
      filter_pattern: '{$.userIdentity.type = Root}'
    };

    it('throws an error', function() {
      expect(function() {
        getResources(trigger, funcName, region);
      }).to.throw(Error, 'log_group_name is required for CloudWatch Logs triggers');
    });
  });

  context('when filter_pattern is not specified', function() {
    const trigger = {
      log_group_name: 'test-log-group'
    };

    it('throws an error', function() {
      expect(function() {
        getResources(trigger, funcName, region);
      }).to.throw(Error, 'filter_pattern is required for CloudWatch Logs triggers');
    });
  });
});
