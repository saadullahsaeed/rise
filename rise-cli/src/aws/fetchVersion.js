'use strict';

const log = require('../utils/log');

module.exports = function fetchVersion(session) {
  const params = {
    Bucket: session.bucketName,
    Key: 'rise.json'
  };

  session.state = 'FETCHING_VERSION';
  return session.aws.s3.getObject(params).promise()
    .then(function(data) {
      log.info("rise.json found.");
      const riseJSON = JSON.parse(data.Body);

      if (session.uuid !== riseJSON.uuid) {
        return Promise.reject('The uuid does not match. Please check your bucket name.');
      }

      session.state = 'FETCHED_VERSION';
      session.riseJSON = riseJSON;
      return Promise.resolve(session);
    })
    .catch(function(err) {
      if (err.message && err.message.indexOf('does not exist') > -1) {
        log.info('rise.json does not exist.');
        session.riseJSON.version_hashes = {};
        session.riseJSON.uuid = session.uuid;
        session.state = 'FETCHED_VERSION';
        return Promise.resolve(session);
      } else {
        return Promise.reject(err);
      }
    });
};
