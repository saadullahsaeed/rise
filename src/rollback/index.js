"use strict";

const AWS                  = require('aws-sdk'),
      getStack             = require('../aws/getStack').getStack,
      updateStackToVersion = require('../aws/updateStackToVersion').updateStackToVersion,
      deployAPI            = require('../aws/deployAPI').deployAPI,
      getStackTemplate     = require('../aws/getStackTemplate').getStackTemplate,
      fetchVersion         = require('../aws/fetchVersion').fetchVersion,
      handleInterrupt      = require('../aws/handleInterrupt').handleInterrupt,
      uploadNFXFiles       = require('../aws/uploadNFXFiles').uploadNFXFiles,
      consoleLog           = require('../utils/consoleLog').consoleLog;

module.exports = function(nfx, version) {
  consoleLog('info', 'Rolling back to a previous version...');

  // FIXME: It should be configurable.
  nfx.stage = 'staging';

  nfx.state = 'ROLLING_BACK';
  getStack(nfx)
    .then((updatedNFX) => {
      return fetchVersion(updatedNFX);
    })
    .then((updatedNFX) => {
      const activeVersion = updatedNFX.nfxJSON.active_version;
      updatedNFX.previousVersion = activeVersion;
      updatedNFX.version = version;

      consoleLog('info', `Current active version is "${activeVersion}". Rolling back to "${version}".`);

      nfx.state = 'UPDATING';
      return updateStackToVersion(updatedNFX);
    })
    .then((updatedNFX) => {
      return getStackTemplate(updatedNFX);
    })
    .then((updatedNFX) => {
      nfx.state = 'DEPLOYING';
      return deployAPI(updatedNFX, { rollback: true });
    })
    .then((updatedNFX) => {
      nfx.state = 'SAVING';

      nfx.nfxJSON.active_version = nfx.version;
      return uploadNFXFiles(updatedNFX);
    })
    .catch((err) => {
      consoleLog('err', err);
    });

  process.on('SIGINT', function () {
    handleInterrupt(nfx);
  });
}
