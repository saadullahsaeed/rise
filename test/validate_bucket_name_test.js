'use strict';

const validateBucketName = require('../src/utils/validateBucketName');

describe('validateBucketName', function() {
  it('returns null if the name is valid', function() {
    expect(validateBucketName('1234')).to.be.null;
    expect(validateBucketName('b.1.2.3-')).to.be.null;
  });

  it('returns an error if the length of bucket is invalid', function() {
    expect(validateBucketName('12')).not.to.be.null;
    expect(validateBucketName('1111111111111111111111111111111111111111111111111111111111111111')).not.to.be.null;
  });

  it('returns an error if it contains invalid lables', function() {
    expect(validateBucketName('.12')).not.to.be.null;
    expect(validateBucketName('123..1234')).not.to.be.null;
    expect(validateBucketName('123.-1234')).not.to.be.null;
    expect(validateBucketName('123$#')).not.to.be.null;
  });

  it('returns an error if it is formatted as an IP address', function() {
    expect(validateBucketName('12.123.123.123')).not.to.be.null;
    expect(validateBucketName('12444444.123.123.123')).to.be.null;
    expect(validateBucketName('123.123.123')).to.be.null;
  });
});
