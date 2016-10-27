'use strict';

const log = require('../utils/log');

module.exports = function fetchVersion(nfx) {
  const params = {
    Bucket: nfx.bucketName,
    Key: 'nfx.json'
  };

  return nfx.aws.s3.getObject(params).promise()
    .then(function(data) {
      log.info("nfx.json found.");
      const nfxJSON = JSON.parse(data.Body);

      if (nfx.uuid !== nfxJSON.uuid) {
        return Promise.reject('The uuid does not match. Please check your bucket name.');
      }

      nfx.nfxJSON = nfxJSON;
      return Promise.resolve(nfx);
    })
    .catch(function(err) {
      if (err.message && err.message.indexOf('does not exist') > -1) {
        log.info('nfx.json does not exist.');
        nfx.nfxJSON.version_hashes = {};
        nfx.nfxJSON.uuid = nfx.uuid;
        return Promise.resolve(nfx);
      } else {
        return Promise.reject(err);
      }
    });
};
