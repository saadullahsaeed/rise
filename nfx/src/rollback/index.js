"use strict";

const getStack = require('../aws/getStack'),
      rollback = require('../aws/rollback'),
      deployAPI = require('../aws/deployAPI'),
      getStackTemplate = require('../aws/getStackTemplate'),
      fetchVersion = require('../aws/fetchVersion'),
      uploadNFXFiles = require('../aws/uploadNFXFiles'),
      handleInterrupt = require('../aws/handleInterrupt'),
      log = require('../utils/log');

module.exports = function(nfx, version) {
  log.info('Rolling back to a previous version...');

  getStack(nfx)
    .then(fetchVersion)
    .then(function(nfx) {
      return rollback(nfx, version);
    })
    .then(getStackTemplate(nfx))
    .then(function(nfx) {
      return deployAPI(nfx, { rollback: true });
    })
    .then(uploadNFXFiles)
    .catch(log.error);

  process.on('SIGINT', function() {
    handleInterrupt(nfx);
  });
};
