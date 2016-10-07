"use strict";

const AWS                  = require('aws-sdk'),
      getStack             = require('../aws/getStack').getStack,
      getBucketName        = require('../aws/getBucketName').getBucketName,
      updateStackToVersion = require('../aws/updateStackToVersion').updateStackToVersion,
      deployAPI            = require('../aws/deployAPI').deployAPI,
      getStackTemplate     = require('../aws/getStackTemplate').getStackTemplate,
      consoleLog           = require('../utils/consoleLog').consoleLog;

module.exports = function(nfx, version) {
  consoleLog('info', 'Rolling back to a previous version...');

  getStack(nfx)
    .then((updatedNFX) => {
      return getBucketName(updatedNFX);
    })
    .then((updatedNFX) => {
      // FIXME: It should be configurable.
      nfx.stage = 'staging';
      updatedNFX.version = version;
      return updateStackToVersion(updatedNFX);
    })
    .then((updatedNFX) => {
      return getStackTemplate(updatedNFX);
    })
    .then((updatedNFX) => {
      // FIXME:
      return deployAPI(updatedNFX, { rollback: true });
    })
    .catch((err) => {
      consoleLog('err', err);
    });
}
