'use strict';

const deployAPI = require('../src/aws/deployAPI');

describe('deployAPI', function() {
  let session,
      updateStackFn,
      waitForFn;

  beforeEach(function() {
    updateStackFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
      resolve({});
    });

    waitForFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
      resolve({
        Stacks: [
          {
            StackId: "arn:aws:cloudformation:somewhere:123456:stack/my-test-stack/67890",
            StackName: "Rise-my-test-stack",
            Outputs: [
              {
                OutputKey: "RiseBaseURL",
                OutputValue: "https://123456.execute-api.somewhere.amazonaws.com/"
              }
            ]
          }
        ]
      });
    });

    session = {
      stackName: 'my-test-stack',
      stage: 'test',
      version: 'v2',
      riseJSON: {},
      aws: {
        cf: {
          updateStack: updateStackFn,
          waitFor: waitForFn
        },
        cfTemplate: {}
      }
    };
  });

  it('updates stack', function() {
    return deployAPI(session, {})
      .then(function(session) {
        expect(session.state).to.equal('DEPLOYED');
        expect(updateStackFn).to.have.been.calledOnce;

        const p = updateStackFn.getCall(0).args[0];
        expect(p.StackName).to.equal('my-test-stack');
        expect(p.Capabilities).to.deep.equal(['CAPABILITY_IAM']);

        expect(waitForFn).to.have.been.calledOnce;
        expect(waitForFn).to.have.been.calledAfter(updateStackFn);
      });
  });

  it('sets new deployment tag as resource', function() {
    return deployAPI(session, {})
      .then(function(/* session */) {
        const p = updateStackFn.getCall(0).args[0],
              cfTemplate = JSON.parse(p.TemplateBody);

        expect(cfTemplate.Resources).to.have.key('RiseDeploymentv2');
      });
  });

  it('sets base url as output', function() {
    return deployAPI(session, {})
      .then(function(/* session */) {
        const p = updateStackFn.getCall(0).args[0],
              cfTemplate = JSON.parse(p.TemplateBody);

        expect(cfTemplate.Outputs).to.have.key('RiseBaseURL');
      });
  });

  context("when rollback is true", function() {
    it("appends `Rollback` to new deployment tag name", function() {
      return deployAPI(session, {rollback: true})
        .then(function(/* session */) {
          const p = updateStackFn.getCall(0).args[0],
                cfTemplate = JSON.parse(p.TemplateBody);

          expect(cfTemplate.Resources).to.have.key('RiseDeploymentv2Rollback');
        });
    });
  });

  context("when there is no updates", function() {
    beforeEach(function() {
      updateStackFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
        reject({ message: 'No updates are to be performed' });
      });

      session.aws.cf.updateStack = updateStackFn;
    });

    it("proceeds to next step", function() {
      return deployAPI(session, {})
        .then(function(/* session */) {
          expect(updateStackFn).to.have.been.calledOnce;
          expect(waitForFn).to.not.have.been.called;
        });
    });
  });

  context("when an error has occurred", function() {
    beforeEach(function() {
      updateStackFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
        reject({ message: 'some error' });
      });

      session.aws.cf.updateStack = updateStackFn;
    });

    it("returns an error", function() {
      return deployAPI(session, {})
        .then(function() {
          fail('this promise should not have been resolved');
        })
        .catch(function(err) {
          expect(err).not.to.be.null;
          expect(updateStackFn).to.have.been.calledOnce;
          expect(waitForFn).to.not.have.been.called;
        });
    });
  });
});
