'use strict';

const getBucket = require('../src/aws/getBucket');

describe('getBucket', function() {
  let nfx,
      headBucketFn,
      createBucketFn,
      region,
      bucketName;

  beforeEach(function() {
    bucketName = 'foo-bar';
    region = 'somewhere';
    createBucketFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
      resolve();
    });

    nfx = {
      bucketName,
      region,
      aws: {
        s3: {
          createBucket: createBucketFn
        }
      }
    };
  });

  context('when a bucket exists', function() {
    beforeEach(function() {
      headBucketFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
        resolve();
      });

      nfx.aws.s3.headBucket = headBucketFn;
    });

    it('calls headBucket with bucketName', function() {
      return getBucket(nfx)
        .then(function(nfx) {
          expect(nfx).to.exist;
          expect(headBucketFn).to.have.been.calledOnce;
          expect(headBucketFn).to.have.been.calledWith({ Bucket: bucketName });
          expect(createBucketFn).to.not.have.been.called;
        });
    });
  });

  context('when a bucket does not exist', function() {
    beforeEach(function() {
      headBucketFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
        reject({ code: 'NotFound' });
      });

      nfx.aws.s3.headBucket = headBucketFn;
    });

    it('makes a request to create a bucket', function() {
      return getBucket(nfx)
        .then(function(nfx) {
          expect(nfx).to.exist;
          expect(headBucketFn).to.have.been.calledOnce;
          expect(headBucketFn).to.have.been.calledWith({ Bucket: bucketName });
          expect(createBucketFn).to.have.been.calledOnce;
          expect(createBucketFn).to.have.been.calledWith({
            Bucket: bucketName,
            CreateBucketConfiguration: {
              LocationConstraint: region
            }
          });
          expect(createBucketFn).to.have.been.calledAfter(headBucketFn);
        });
    });
  });

  context('when fails to fetch a bucket', function() {
    beforeEach(function() {
      headBucketFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
        reject({ code: 'OtherError' });
      });

      nfx.aws.s3.headBucket = headBucketFn;
    });

    it('returns an error', function() {
      return getBucket(nfx)
        .then(function() {
          fail('this promise should not have been resolved');
        })
        .catch(function(err) {
          expect(err).to.exist;
          expect(headBucketFn).to.have.been.calledOnce;
          expect(headBucketFn).to.have.been.calledWith({ Bucket: bucketName });
          expect(createBucketFn).to.not.have.been.called;
        });
    });
  });
});
