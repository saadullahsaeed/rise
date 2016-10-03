"use strict";

const consoleLog            = require('../utils/consoleLog').consoleLog,
      compressAndUpload     = require('../aws/compressAndUpload').compressAndUpload,
      getStack              = require('../aws/getStack').getStack,
      describeStackResource = require('../aws/describeStackResource').describeStackResource,
      deployFunctions       = require('../aws/deployFunctions').deployFunctions,
      uploadAPITemplate     = require('../aws/uploadAPITemplate').uploadAPITemplate,
      updateAPIs            = require('../aws/updateAPIs').updateAPIs,
      deployAPIs            = require('../aws/deployAPIs').deployAPIs;

module.exports = (nfx) => {
  consoleLog('info', 'Checking stack...');
  // FIXME: should not be hardcoded
  nfx.version = '0.0.4';
  nfx.stage = 'staging';

  getStack(nfx)
    .then(() => {
      return describeStackResource(nfx);
    })
    .then((updatedNFX) => {
      return compressAndUpload(updatedNFX);
    })
    .then((updatedNFX) => {
      return deployFunctions(updatedNFX);
    })
    .then((updatedNFX) => {
      return uploadAPITemplate(updatedNFX);
    })
    .then((updatedNFX) => {
      return updateAPIs(updatedNFX);
    })
    .then((updatedNFX) => {
      return deployAPIs(updatedNFX);
    })
    .catch((err) => {
      consoleLog('err', err);
    });
}
