'use strict';

const deployAPI = require('../src/aws/deployAPI');

describe('deployAPI', function() {
  let nfx,
      updateStackFn,
      waitForFn;

  beforeEach(function() {
    updateStackFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
      resolve({});
    });

    waitForFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
      resolve({});
    });

    nfx = {
      stackName: 'my-test-stack',
      stage: 'test',
      version: 'v2',
      nfxJSON: {},
      aws: {
        cf: {
          updateStack: updateStackFn,
          waitFor: waitForFn
        },
        cfTemplate: {}
      }
    };
  });

  it('updates stack', function(done) {
    deployAPI(nfx, {})
      .then(function(nfx) {
        expect(nfx.state).to.equal('DEPLOYED');
        expect(updateStackFn).to.have.been.calledOnce;

        const p = updateStackFn.getCall(0).args[0];
        expect(p.StackName).to.equal('my-test-stack');
        expect(p.Capabilities).to.deep.equal(['CAPABILITY_IAM']);

        expect(waitForFn).to.have.been.calledOnce;
        expect(waitForFn).to.have.been.calledAfter(updateStackFn);
        done();
      })
      .catch(done);
  });

  it('sets new deployment tag as resource', function(done) {
    deployAPI(nfx, {})
      .then(function(/* nfx */) {
        const p = updateStackFn.getCall(0).args[0],
              cfTemplate = JSON.parse(p.TemplateBody);

        expect(cfTemplate.Resources).to.have.key('NFXDeploymentv2');
        done();
      })
      .catch(done);
  });

  it('sets base url as output', function(done) {
    deployAPI(nfx, {})
      .then(function(/* nfx */) {
        const p = updateStackFn.getCall(0).args[0],
              cfTemplate = JSON.parse(p.TemplateBody);

        expect(cfTemplate.Outputs).to.have.key('NFXBaseURL');
        done();
      })
      .catch(done);
  });

  context("when rollback is true", function() {
    it("appends `Rollback` to new deployment tag name", function(done) {
      deployAPI(nfx, {rollback: true})
        .then(function(/* nfx */) {
          const p = updateStackFn.getCall(0).args[0],
                cfTemplate = JSON.parse(p.TemplateBody);

          expect(cfTemplate.Resources).to.have.key('NFXDeploymentv2Rollback');
          done();
        })
        .catch(done);
    });
  });

  context("when there is no updates", function() {
    beforeEach(function() {
      updateStackFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
        reject({ message: 'No updates are to be performed' });
      });

      nfx.aws.cf.updateStack = updateStackFn;
    });

    it("proceeds to next step", function(done) {
      deployAPI(nfx, {})
        .then(function(/* nfx */) {
          expect(updateStackFn).to.have.been.calledOnce;
          expect(waitForFn).to.not.have.been.called;
          done();
        })
        .catch(done);
    });
  });

  context("when an error has occurred", function() {
    beforeEach(function() {
      updateStackFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
        reject({ message: 'some error' });
      });

      nfx.aws.cf.updateStack = updateStackFn;
    });

    it("returns an error", function(done) {
      deployAPI(nfx, {})
        .then(function() {
          done('unexpected then');
        })
        .catch(function(err) {
          expect(err).not.to.be.null;
          expect(updateStackFn).to.have.been.calledOnce;
          expect(waitForFn).to.not.have.been.called;
          done();
        });
    });
  });
});
