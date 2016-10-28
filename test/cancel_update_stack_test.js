'use strict';

const cancelUpdateStack = require('../src/aws/cancelUpdateStack');

describe('cancelUpdateStack', function() {
  let nfx,
      cancelUpdateStackFn,
      describeStacksFn;

  beforeEach(function() {
    cancelUpdateStackFn = sinon.spy(function(params, cb) {
      cb(null, {});
    });

    describeStacksFn = sinon.spy(function(params, cb) {
      cb(null, {Stacks: [{StackStatus: 'UPDATE_ROLLBACK_COMPLETE'}]});
    });

    nfx = {
      stackName: 'my-stack',
      aws: {
        cf: {
          cancelUpdateStack: cancelUpdateStackFn,
          describeStacks: describeStacksFn
        }
      }
    };
  });

  it('cancels updating a stack', function() {
    return cancelUpdateStack(nfx, {})
      .then(function(nfx) {
        expect(nfx.state).to.equal('CANCELLED');
        expect(cancelUpdateStackFn).to.have.been.calledOnce;
        const cancelStackParams = cancelUpdateStackFn.getCall(0).args[0];
        expect(cancelStackParams.StackName).to.equal('my-stack');

        expect(describeStacksFn).to.have.been.calledOnce;
        expect(describeStacksFn).to.have.been.calledAfter(cancelUpdateStackFn);
        const describeStacksParams = describeStacksFn.getCall(0).args[0];
        expect(describeStacksParams.StackName).to.equal('my-stack');
      });
  });

  context("when it returns 'CancelUpdateStack cannot be called from current stack status' error", function() {
    beforeEach(function() {
      cancelUpdateStackFn = sinon.spy(function(params, cb) {
        cb({
          message: 'CancelUpdateStack cannot be called from current stack status'
        }, null);
      });

      nfx.aws.cf.cancelUpdateStack = cancelUpdateStackFn;
    });

    it('resolves the promise', function() {
      return cancelUpdateStack(nfx, {})
        .then(function(nfx) {
          expect(nfx.state).to.equal('UNEXPECTEDLY_UPDATED');
          expect(cancelUpdateStackFn).to.have.been.calledOnce;

          expect(describeStacksFn).not.to.have.been.called;
        });
    });
  });

  context("when it returns other error", function() {
    beforeEach(function() {
      cancelUpdateStackFn = sinon.spy(function(params, cb) {
        cb({ message: 'error' }, null);
      });

      nfx.aws.cf.cancelUpdateStack = cancelUpdateStackFn;
    });

    it('resolves the promise', function() {
      return cancelUpdateStack(nfx, {})
        .then(function() {
          fail('this promise should not have been resolved');
        })
        .catch(function(err) {
          expect(err).to.exist;
          expect(cancelUpdateStackFn).to.have.been.calledOnce;
          expect(describeStacksFn).not.to.have.been.called;
        });
    });
  });
});
