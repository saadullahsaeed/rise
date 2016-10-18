'use strict';

const fetchVersion = require('../src/aws/fetchVersion');

describe('fetchVersion', function() {
  let nfx,
      getObjectFn,
      bucketName;

  beforeEach(function() {
    bucketName = 'foo-bar';
    getObjectFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
      resolve({
        Body: '{ "SomeKey": "SomeValue" }'
      });
    });

    nfx = {
      bucketName,
      nfxJSON: {},
      aws: {
        s3: {
          getObject: getObjectFn
        }
      }
    };
  });

  context('when a nfx file exists', function() {
    it('fetch the file and set it to nfxJSON', function(done) {
      fetchVersion(nfx)
        .then(function(nfx) {
          expect(nfx.nfxJSON).to.deep.equal({ SomeKey: 'SomeValue' });
          expect(getObjectFn).to.have.been.calledOnce;
          expect(getObjectFn).to.have.been.calledWith({ Bucket: bucketName, Key: 'nfx.json' });
          done();
        })
        .catch(done);
    });
  });

  context('when a nfx file does not exist', function() {
    beforeEach(function() {
      getObjectFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
        reject({message: 'does not exist'});
      });

      nfx.aws.s3.getObject = getObjectFn;
    });

    it('sets empty object to nfxJSON.version_hashes', function(done) {
      fetchVersion(nfx)
        .then(function(nfx) {
          expect(nfx.nfxJSON.version_hashes).to.deep.equal({});
          expect(getObjectFn).to.have.been.calledOnce;
          expect(getObjectFn).to.have.been.calledWith({ Bucket: bucketName, Key: 'nfx.json' });
          done();
        })
        .catch(done);
    });
  });

  context('when fails to fetch a nfx file', function() {
    beforeEach(function() {
      getObjectFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
        reject({ message: 'some error' });
      });

      nfx.aws.s3.getObject = getObjectFn;
    });

    it('returns an error', function(done) {
      fetchVersion(nfx)
        .then(function() {
          done('unexpected then');
        })
        .catch(function(err) {
          expect(err).to.not.be.null;
          expect(nfx.nfxJSON).to.deep.equal({});
          expect(getObjectFn).to.have.been.calledOnce;
          expect(getObjectFn).to.have.been.calledWith({ Bucket: bucketName, Key: 'nfx.json' });
          done();
        });
    });
  });
});
