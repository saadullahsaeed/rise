'use strict';

const getResources = require('../../src/aws/triggers/s3');

describe('S3 trigger getResources', function() {
  const funcName = 'AppHelloIndex';

  context('with a basic trigger config', function() {
    const trigger = {
      event: 's3:ObjectCreated:Put',
      bucket: 'image-uploads'
    };

    it('returns an S3 bucket resource and a permission resource', function() {
      const resources = getResources(trigger, funcName);
      expect(resources).to.have.property('RiseimageuploadsBucket');

      const bucketResource = resources['RiseimageuploadsBucket'];
      expect(bucketResource).to.have.property('Type', 'AWS::S3::Bucket');
      expect(bucketResource).to.have.property('Properties');

      const bucketProps = bucketResource.Properties;
      expect(bucketProps).to.have.property('BucketName', 'image-uploads');
      expect(bucketProps).to.have.deep.property('NotificationConfiguration.LambdaConfigurations');

      expect(bucketProps.NotificationConfiguration.LambdaConfigurations).to.have.lengthOf(1);

      const lambdaCfg = bucketProps.NotificationConfiguration.LambdaConfigurations[0];
      expect(lambdaCfg).to.deep.equal({
        Event: 's3:ObjectCreated:Put',
        Function: {
          'Fn::GetAtt': [ funcName, 'Arn' ]
        }
      });

      const permissionResourceName = `${funcName}imageuploadsS3TriggerLambdaPermission`;
      expect(resources).to.have.property(permissionResourceName);

      const permissionResource = resources[`${funcName}imageuploadsS3TriggerLambdaPermission`];
      expect(permissionResource).to.have.property('Type', 'AWS::Lambda::Permission');
      expect(permissionResource).to.have.property('Properties');

      const permissionProps = permissionResource.Properties;
      expect(permissionProps).to.deep.equal({
        FunctionName: { 'Fn::GetAtt': [ funcName, 'Arn' ] },
        Action: 'lambda:InvokeFunction',
        Principal: 's3.amazonaws.com',
        SourceArn: 'arn:aws:s3:::image-uploads'
      });
    });
  });

  context('when bucket is not specified', function() {
    const trigger = {
      event: 's3:ObjectCreated:Put'
    };

    it('throws an error', function() {
      expect(function() {
        getResources(trigger, funcName);
      }).to.throw(Error, 'bucket is required for S3 triggers');
    });
  });

  context('when event is not specified', function() {
    const trigger = {
      bucket: 'image-uploads'
    };

    it('defaults to the s3:ObjectCreated:* event', function() {
      const resources = getResources(trigger, funcName);

      expect(resources['RiseimageuploadsBucket']).to.have.deep.property(
        'Properties.NotificationConfiguration.LambdaConfigurations[0].Event',
        's3:ObjectCreated:*'
      );
    });
  });

  context('with prefix specified', function() {
    const trigger = {
      event: 's3:ObjectCreated:Put',
      bucket: 'image-uploads',
      prefix: 'images/'
    };

    it('includes a filter rule on the S3 bucket resource', function() {
      const resources = getResources(trigger, funcName);
      expect(resources).to.have.property('RiseimageuploadsBucket');

      const bucketResource = resources['RiseimageuploadsBucket'];
      expect(bucketResource).to.have.property('Type', 'AWS::S3::Bucket');
      expect(bucketResource).to.have.property('Properties');

      const bucketProps = bucketResource.Properties;
      expect(bucketProps).to.have.property('BucketName', 'image-uploads');
      expect(bucketProps).to.have.deep.property('NotificationConfiguration.LambdaConfigurations');

      expect(bucketProps.NotificationConfiguration.LambdaConfigurations).to.have.lengthOf(1);

      const lambdaCfg = bucketProps.NotificationConfiguration.LambdaConfigurations[0];
      expect(lambdaCfg).to.deep.equal({
        Event: 's3:ObjectCreated:Put',
        Function: {
          'Fn::GetAtt': [ funcName, 'Arn' ]
        },
        Filter: {
          S3Key: {
            Rules: [{ Name: 'prefix', Value: 'images/' }]
          }
        }
      });
    });
  });

  context('with suffix specified', function() {
    const trigger = {
      event: 's3:ObjectCreated:Put',
      bucket: 'image-uploads',
      suffix: '.png'
    };

    it('includes a filter rule on the S3 bucket resource', function() {
      const resources = getResources(trigger, funcName);
      expect(resources).to.have.property('RiseimageuploadsBucket');

      const bucketResource = resources['RiseimageuploadsBucket'];
      expect(bucketResource).to.have.property('Type', 'AWS::S3::Bucket');
      expect(bucketResource).to.have.property('Properties');

      const bucketProps = bucketResource.Properties;
      expect(bucketProps).to.have.property('BucketName', 'image-uploads');
      expect(bucketProps).to.have.deep.property('NotificationConfiguration.LambdaConfigurations');

      expect(bucketProps.NotificationConfiguration.LambdaConfigurations).to.have.lengthOf(1);

      const lambdaCfg = bucketProps.NotificationConfiguration.LambdaConfigurations[0];
      expect(lambdaCfg).to.deep.equal({
        Event: 's3:ObjectCreated:Put',
        Function: {
          'Fn::GetAtt': [ funcName, 'Arn' ]
        },
        Filter: {
          S3Key: {
            Rules: [{ Name: 'suffix', Value: '.png' }]
          }
        }
      });
    });
  });

  context('with prefix and suffix specified', function() {
    const trigger = {
      event: 's3:ObjectCreated:Put',
      bucket: 'image-uploads',
      prefix: 'images/',
      suffix: '.png'
    };

    it('includes filter rules on the S3 bucket resource', function() {
      const resources = getResources(trigger, funcName);
      expect(resources).to.have.property('RiseimageuploadsBucket');

      const bucketResource = resources['RiseimageuploadsBucket'];
      expect(bucketResource).to.have.property('Type', 'AWS::S3::Bucket');
      expect(bucketResource).to.have.property('Properties');

      const bucketProps = bucketResource.Properties;
      expect(bucketProps).to.have.property('BucketName', 'image-uploads');
      expect(bucketProps).to.have.deep.property('NotificationConfiguration.LambdaConfigurations');

      expect(bucketProps.NotificationConfiguration.LambdaConfigurations).to.have.lengthOf(1);

      const rules = bucketProps.NotificationConfiguration.LambdaConfigurations[0].Filter.S3Key.Rules;
      expect(rules).to.deep.have.members([
        { Name: 'prefix', Value: 'images/' },
        { Name: 'suffix', Value: '.png' }
      ]);
    });
  });
});
