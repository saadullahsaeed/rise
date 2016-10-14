'use strict';

const log = require('../utils/log');

module.exports.fetchVersion = function(nfx) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: nfx.bucketName,
      Key: 'nfx.json',
    };

    nfx.awsSDK.s3.getObject(params, function(err, data) {
      if (err) {
        if (err.message.indexOf('does not exist') > -1) {
          nfx.nfxJSON.version_hashes = {}
          resolve(nfx);
        } else {
          reject(err);
        }
      } else {
        nfx.nfxJSON = JSON.parse(data.Body);
        resolve(nfx);
      }
    });
  });
}
