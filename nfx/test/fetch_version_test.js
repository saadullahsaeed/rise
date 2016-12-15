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
        Body: '{ "uuid": "a1b2c3", "active_version": "v2", "version_hashes": {"v1":"12345", "v2":"67890"} }'
      });
    });

    nfx = {
      uuid: 'a1b2c3',
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
    it('fetch the file and set it to nfxJSON', function() {
      return fetchVersion(nfx)
        .then(function(nfx) {
          expect(nfx.nfxJSON).to.deep.equal({
            uuid: 'a1b2c3',
            active_version: 'v2',
            version_hashes: { v1: '12345', v2: '67890' }
          });
          expect(getObjectFn).to.have.been.calledOnce;
          expect(getObjectFn).to.have.been.calledWith({ Bucket: bucketName, Key: 'nfx.json' });
        });
    });

    context('uuid is not the same', function() {
      beforeEach(function() {
        getObjectFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
          resolve({
            Body: '{ "uuid": "d4e5f6", "active_version": "v2", "version_hashes": {"v1":"12345", "v2":"67890"} }'
          });
        });

        nfx.aws.s3.getObject = getObjectFn;
      });

      it('returns an error', function() {
        return fetchVersion(nfx)
          .then(function() {
            fail('this promise should not have been resolved');
          })
          .catch(function(err) {
            expect(err).to.contain('The uuid does not match. Please check your bucket name.');
          });
      });
    });
  });

  context('when a nfx file does not exist', function() {
    beforeEach(function() {
      getObjectFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
        reject({message: 'does not exist'});
      });
      nfx.aws.s3.getObject = getObjectFn;
    });

    it('sets empty object to nfxJSON.version_hashes', function() {
      return fetchVersion(nfx)
        .then(function(nfx) {
          expect(nfx.nfxJSON).to.deep.equal({
            uuid: 'a1b2c3',
            version_hashes: {}
          });
          expect(getObjectFn).to.have.been.calledOnce;
          expect(getObjectFn).to.have.been.calledWith({ Bucket: bucketName, Key: 'nfx.json' });
        });
    });
  });

  context('when fails to fetch a nfx file', function() {
    beforeEach(function() {
      getObjectFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
        reject({ message: 'some error' });
      });

      nfx.aws.s3.getObject = getObjectFn;
    });

    it('returns an error', function() {
      return fetchVersion(nfx)
        .then(function() {
          fail('this promise should not have been resolved');
        })
        .catch(function(err) {
          expect(err).to.not.be.null;
          expect(nfx.nfxJSON).to.deep.equal({});
          expect(getObjectFn).to.have.been.calledOnce;
          expect(getObjectFn).to.have.been.calledWith({ Bucket: bucketName, Key: 'nfx.json' });
        });
    });
  });
});
