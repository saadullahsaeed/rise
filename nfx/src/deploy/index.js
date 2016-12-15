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
      uploadNFXFiles = require('../aws/uploadNFXFiles'),
      handleInterrupt = require('../aws/handleInterrupt');

module.exports = function(nfx) {
  getBucket(nfx)
    .then(getStack)
    .then(fetchVersion)
    .then(compressAndCompare)
    .then(uploadFunctions)
    .then(updateStack)
    .then(pingFunctions)
    .then(function(nfx) {
      return deployAPI(nfx, {});
    })
    .then(uploadNFXFiles)
    .catch(function(err) {
      log.error(err);
      handleInterrupt(nfx);
    });

  process.on('SIGINT', function() {
    handleInterrupt(nfx);
  });
};