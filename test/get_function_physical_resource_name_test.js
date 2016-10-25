'use strict';

const getFunctionPhysicalResourceName = require('../src/aws/getFunctionPhysicalResourceName');

describe('getFunctionPhysicalResourceName', function() {
  let nfx,
      functionName,
      stackName,
      describeStackResourceFn;

  beforeEach(function() {
    functionName = 'appIndex';
    stackName = 'foo-bar';
    describeStackResourceFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
      resolve({
        StackResourceDetail: {
          PhysicalResourceId: 'resourceid'
        }
      });
    });

    nfx = {
      stackName,
      aws: {
        cf: {
          describeStackResource: describeStackResourceFn
        }
      }
    };
  });

  context('when a resource exists', function() {
    it('calls describeStackResource with resourceName', function() {
      return getFunctionPhysicalResourceName(nfx, functionName)
        .then(function(physicalResourceId) {
          expect(physicalResourceId).to.not.be.null;
          expect(physicalResourceId).to.equal('resourceid');
          expect(describeStackResourceFn).to.have.been.calledOnce;
          expect(describeStackResourceFn).to.have.been.calledWith({
            LogicalResourceId: functionName,
            StackName: stackName
          });
        });
    });
  });

  context('when a resource does not exist', function() {
    beforeEach(function() {
      describeStackResourceFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
        reject({ message: 'does not exist' });
      });

      nfx.aws.cf.describeStackResource = describeStackResourceFn;
    });

    it('returns an error', function() {
      getFunctionPhysicalResourceName(nfx, functionName)
        .then(function() {
          fail('unexpected then');
        })
        .catch(function(err) {
          expect(err).to.not.be.null;
          expect(describeStackResourceFn).to.have.been.calledOnce;
          expect(describeStackResourceFn).to.have.been.calledWith({
            LogicalResourceId: functionName,
            StackName: stackName
          });
        });
    });
  });
});
