'use strict';

const getStack = require('../src/aws/getStack');

describe('getStack', function() {
  let nfx,
      stackName,
      describeStacksFn,
      createStackFn,
      waitForFn;

  beforeEach(function() {
    stackName = 'foo-bar';
    createStackFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
      resolve({});
    });

    waitForFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
      resolve({});
    });

    nfx = {
      stackName,
      aws: {
        cf: {
          createStack: createStackFn,
          waitFor: waitForFn
        }
      }
    };
  });

  context('when a stack exists', function() {
    beforeEach(function() {
      describeStacksFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
        resolve({});
      });

      nfx.aws.cf.describeStacks = describeStacksFn;
    });

    it('calls describeStacks with stackName', function() {
      return getStack(nfx)
        .then(function(nfx) {
          expect(nfx).to.exist;
          expect(nfx.state).to.equal('FETCHED_STACK');
          expect(describeStacksFn).to.have.been.calledOnce;
          expect(describeStacksFn).to.have.been.calledWith({ StackName: stackName });
          expect(createStackFn).to.not.have.been.called;
        });
    });
  });

  context('when a stack does not exist', function() {
    beforeEach(function() {
      describeStacksFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
        reject({ message: 'does not exist' });
      });

      nfx.aws.cf.describeStacks = describeStacksFn;
    });

    it('makes a request to create a stack', function() {
      return getStack(nfx)
        .then(function(nfx) {
          expect(nfx).to.exist;
          expect(nfx.state).to.equal('CREATED');
          expect(describeStacksFn).to.have.been.calledOnce;
          expect(describeStacksFn).to.have.been.calledWith({ StackName: stackName });

          expect(createStackFn).to.have.been.called;
          expect(createStackFn).to.have.been.calledWithMatch({ StackName: stackName });
          expect(createStackFn).to.have.been.calledAfter(describeStacksFn);

          expect(waitForFn).to.have.been.calledOnce;
          expect(waitForFn).to.have.been.calledWith('stackCreateComplete', { StackName: stackName });
          expect(waitForFn).to.have.been.calledAfter(createStackFn);
        });
    });
  });

  context('when fails to fetch a stack', function() {
    beforeEach(function() {
      describeStacksFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
        reject({ message: 'some error' });
      });

      nfx.aws.cf.describeStacks = describeStacksFn;
    });

    it('returns an error', function() {
      return getStack(nfx)
        .then(function() {
          fail('this promise should not have been resolved');
        })
        .catch(function(err) {
          expect(err).to.not.be.null;
          expect(describeStacksFn).to.have.been.calledOnce;
          expect(describeStacksFn).to.have.been.calledWith({ StackName: stackName });
          expect(createStackFn).to.not.have.been.called;
          expect(waitForFn).to.not.have.been.called;
        });
    });
  });
});
