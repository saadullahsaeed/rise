"use strict";

const AWS                  = require('aws-sdk'),
      getStack = require('../aws/getStack'),
      rollback = require('../aws/rollback'),
      deployAPI            = require('../aws/deployAPI').deployAPI,
      getStackTemplate     = require('../aws/getStackTemplate').getStackTemplate,
      fetchVersion         = require('../aws/fetchVersion').fetchVersion,
      handleInterrupt      = require('../aws/handleInterrupt').handleInterrupt,
      uploadNFXFiles       = require('../aws/uploadNFXFiles').uploadNFXFiles,
      log = require('../utils/log');

module.exports = function(nfx, version) {
  log.info('Rolling back to a previous version...');

  // FIXME: It should be configurable.
  nfx.stage = 'staging';
  nfx.state = 'ROLLING_BACK';

  getStack(nfx)
    .then(fetchVersion(nfx))
    .then(rollback(nfx, version))
    .then(getStackTemplate(nfx))
    .then(deployAPI(nfx, { rollback: true }))
    .then(uploadNFXFiles(nfx))
    .catch(log.error);

  process.on('SIGINT', function () {
    handleInterrupt(nfx);
  });
}
