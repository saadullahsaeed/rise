"use strict";

const getStack = require('../aws/getStack'),
      rollback = require('../aws/rollback'),
      deployAPI = require('../aws/deployAPI'),
      getStackTemplate = require('../aws/getStackTemplate'),
      fetchVersion = require('../aws/fetchVersion'),
      uploadRiseFiles = require('../aws/uploadRiseFiles'),
      handleInterrupt = require('../aws/handleInterrupt'),
      log = require('../utils/log');

module.exports = function(session, version) {
  log.info('Rolling back to a previous version...');

  getStack(session)
    .then(fetchVersion)
    .then(function(session) {
      return rollback(session, version);
    })
    .then(getStackTemplate(session))
    .then(function(session) {
      return deployAPI(session, { rollback: true });
    })
    .then(uploadRiseFiles)
    .catch(log.error);

  process.on('SIGINT', function() {
    handleInterrupt(session);
  });
};
