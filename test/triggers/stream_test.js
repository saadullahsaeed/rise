'use strict';

const getResources = require('../../src/aws/triggers/stream');

describe('Stream trigger getResources', function() {
  const funcName = 'AppHelloIndex';

  context('with a DynamoDB stream ARN', function() {
    const trigger = {
      arn: 'arn:aws:dynamodb:ap-southeast-1:12345678:table/products/stream/2016-10-17T08:34:06.888',
      starting_position: 'TRIM_HORIZON'
    };

    it('returns a Lambda EventSourceMapping resource', function() {
      const roleResource = {};
      const resources = getResources(trigger, funcName, roleResource);

      expect(resources).to.have.property('NFXAppHelloIndexdynamodbproductsEventSourceMapping');
      expect(resources['NFXAppHelloIndexdynamodbproductsEventSourceMapping']).to.deep.equal({
        Type: 'AWS::Lambda::EventSourceMapping',
        Properties: {
          EventSourceArn: trigger.arn,
          FunctionName: { 'Fn::GetAtt': [ funcName, 'Arn' ] },
          StartingPosition: 'TRIM_HORIZON'
        }
      });
    });

    it('returns a role resource with IAM policy statements', function() {
      const roleResource = {};
      const resources = getResources(trigger, funcName, roleResource);

      expect(resources).to.have.property('NFXRole');

      const policies = resources['NFXRole'].Properties.Policies;
      expect(policies).to.have.lengthOf(1);
      const policy = policies[0];
      expect(policy).to.have.property('PolicyName', 'NFXAppHelloIndexdynamodbproductsEventSourceMapping-access');

      expect(policy).to.deep.have.property('PolicyDocument.Statement');
      const stmt = policy.PolicyDocument.Statement;
      expect(stmt).to.deep.have.members([
        {
          Effect: 'Allow',
          Action: ['dynamodb:GetRecords', 'dynamodb:ListStreams'],
          Resource: '*'
        },
        {
          Effect: 'Allow',
          Action: ['dynamodb:GetShardIterator', 'dynamodb:DescribeStream'],
          Resource: trigger.arn
        }
      ]);
    });

    context('when batch_size is specified', function() {
      it('includes BatchSize', function() {
        const newTrigger = Object.assign({}, trigger, { batch_size: 10 });

        const roleResource = {};
        const resources = getResources(newTrigger, funcName, roleResource);

        expect(resources).to.have.property('NFXAppHelloIndexdynamodbproductsEventSourceMapping');
        expect(resources['NFXAppHelloIndexdynamodbproductsEventSourceMapping']).to.deep.equal({
          Type: 'AWS::Lambda::EventSourceMapping',
          Properties: {
            EventSourceArn: trigger.arn,
            FunctionName: { 'Fn::GetAtt': [ funcName, 'Arn' ] },
            StartingPosition: 'TRIM_HORIZON',
            BatchSize: 10
          }
        });
      });
    });
  });

  context('with a Kinesis stream ARN', function() {
    const trigger = {
      arn: 'arn:aws:kinesis:ap-southeast-1:12345678:stream/tweets',
      starting_position: 'TRIM_HORIZON'
    };

    it('returns a Lambda EventSourceMapping resource', function() {
      const roleResource = {};
      const resources = getResources(trigger, funcName, roleResource);

      expect(resources).to.have.property('NFXAppHelloIndexkinesistweetsEventSourceMapping');
      expect(resources['NFXAppHelloIndexkinesistweetsEventSourceMapping']).to.deep.equal({
        Type: 'AWS::Lambda::EventSourceMapping',
        Properties: {
          EventSourceArn: trigger.arn,
          FunctionName: { 'Fn::GetAtt': [ funcName, 'Arn' ] },
          StartingPosition: 'TRIM_HORIZON'
        }
      });
    });

    it('returns a role resource with IAM policy statements', function() {
      const roleResource = {};
      const resources = getResources(trigger, funcName, roleResource);

      expect(resources).to.have.property('NFXRole');

      const policies = resources['NFXRole'].Properties.Policies;
      expect(policies).to.have.lengthOf(1);
      const policy = policies[0];
      expect(policy).to.have.property('PolicyName', 'NFXAppHelloIndexkinesistweetsEventSourceMapping-access');

      expect(policy).to.deep.have.property('PolicyDocument.Statement');
      const stmt = policy.PolicyDocument.Statement;
      expect(stmt).to.deep.have.members([
        {
          Effect: 'Allow',
          Action: ['kinesis:GetRecords', 'kinesis:ListStreams'],
          Resource: '*'
        },
        {
          Effect: 'Allow',
          Action: ['kinesis:GetShardIterator', 'kinesis:DescribeStream'],
          Resource: trigger.arn
        }
      ]);
    });

    context('when batch_size is specified', function() {
      it('includes BatchSize', function() {
        const newTrigger = Object.assign({}, trigger, { batch_size: 10 });

        const roleResource = {};
        const resources = getResources(newTrigger, funcName, roleResource);

        expect(resources).to.have.property('NFXAppHelloIndexkinesistweetsEventSourceMapping');
        expect(resources['NFXAppHelloIndexkinesistweetsEventSourceMapping']).to.deep.equal({
          Type: 'AWS::Lambda::EventSourceMapping',
          Properties: {
            EventSourceArn: trigger.arn,
            FunctionName: { 'Fn::GetAtt': [ funcName, 'Arn' ] },
            StartingPosition: 'TRIM_HORIZON',
            BatchSize: 10
          }
        });
      });
    });
  });

  context('when arn is not specified', function() {
    const trigger = {
      starting_position: 'TRIM_HORIZON'
    };

    it('throws an error', function() {
      const roleResource = {};

      expect(function() {
        getResources(trigger, funcName, roleResource);
      }).to.throw(Error, 'arn is required for stream triggers');
    });
  });

  context('when starting_position is not specified', function() {
    const trigger = {
      arn: 'arn:aws:dynamodb:ap-southeast-1:12345678:table/products/stream/2016-10-17T08:34:06.888'
    };

    it('throws an error', function() {
      const roleResource = {};

      expect(function() {
        getResources(trigger, funcName, roleResource);
      }).to.throw(Error, 'starting_position is required for stream triggers');
    });
  });
});
