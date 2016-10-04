"use strict";

const AWS                  = require('aws-sdk'),
      getStack             = require('../aws/getStack').getStack,
      getBucketName        = require('../aws/getBucketName').getBucketName,
      updateStackToVersion = require('../aws/updateStackToVersion').updateStackToVersion,
      consoleLog           = require('../utils/consoleLog').consoleLog;

module.exports = function(nfx, version) {
  consoleLog('info', 'Rolling back to a previous version...');

  getStack(nfx)
    .then((updatedNFX) => {
      return getBucketName(updatedNFX);
    })
    .then((updatedNFX) => {
      updatedNFX.version = version;
      return updateStackToVersion(updatedNFX);
    })
    .catch((err) => {
      consoleLog('err', err);
    });
}
