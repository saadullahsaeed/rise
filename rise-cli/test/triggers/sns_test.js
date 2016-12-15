'use strict';

const getResources = require('../../src/aws/triggers/sns');

describe('SNS trigger getResources', function() {
  const funcName = 'AppHelloIndex';

  context('with a basic trigger config', function() {
    const trigger = {
      topic_name: 'test-topic',
      display_name: 'TestTopic'
    };

    it('returns an SNS resource', function() {
      const resources = getResources(trigger, funcName);
      expect(resources).to.have.property('RisetesttopicSNS');

      const topicResource = resources['RisetesttopicSNS'];
      expect(topicResource.Properties).to.deep.equal({
        TopicName: 'test-topic',
        DisplayName: 'TestTopic',
        Subscription: [{
          Endpoint: { 'Fn::GetAtt': [ funcName, 'Arn' ] },
          Protocol: 'lambda'
        }]
      });
    });

    it('returns a permission resource', function() {
      const resources = getResources(trigger, funcName);

      const permissionResourceName = `RisetesttopicSNSTriggerLambdaPermission`;
      expect(resources).to.have.property(permissionResourceName);

      const permissionResource = resources[permissionResourceName];
      expect(permissionResource).to.have.property('Type', 'AWS::Lambda::Permission');
      expect(permissionResource).to.have.property('Properties');

      const permissionProps = permissionResource.Properties;
      expect(permissionProps).to.deep.equal({
        FunctionName: { 'Fn::GetAtt': [ funcName, 'Arn' ] },
        Action: 'lambda:InvokeFunction',
        Principal: 'sns.amazonaws.com'
      });
    });
  });

  context('when topic_name is not specified', function() {
    const trigger = {
      display_name: 'TestTopic'
    };

    it('throws an error', function() {
      expect(function() {
        getResources(trigger, funcName);
      }).to.throw(Error, 'topic_name is required for SNS topic triggers');
    });
  });
});
