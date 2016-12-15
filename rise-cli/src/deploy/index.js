"use strict";

const log = require('../utils/log'),
      compressAndCompare = require('../aws/compressAndCompare'),
      uploadFunctions = require('../aws/uploadFunctions'),
      getStack = require('../aws/getStack'),
      getBucket = require('../aws/getBucket'),
      fetchVersion = require('../aws/fetchVersion'),
      updateStack = require('../aws/updateStack'),
      deployAPI = require('../aws/deployAPI'),
      pingFunctions = require('../aws/pingFunctions'),
      uploadRiseFiles = require('../aws/uploadRiseFiles'),
      handleInterrupt = require('../aws/handleInterrupt');

module.exports = function(session) {
  getBucket(session)
    .then(getStack)
    .then(fetchVersion)
    .then(compressAndCompare)
    .then(uploadFunctions)
    .then(updateStack)
    .then(pingFunctions)
    .then(function(session) {
      return deployAPI(session, {});
    })
    .then(uploadRiseFiles)
    .catch(function(err) {
      log.error(err);
      handleInterrupt(session);
    });

  process.on('SIGINT', function() {
    handleInterrupt(session);
  });
};
