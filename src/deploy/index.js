"use strict";

const fs                    = require('fs'),
      path                  = require('path'),
      fsStat                = require('../utils/fs').fsStat,
      consoleLog            = require('../utils/consoleLog').consoleLog,
      compressAndCompare    = require('../aws/compressAndCompare').compressAndCompare,
      uploadFunctions       = require('../aws/uploadFunctions').uploadFunctions,
      getStack              = require('../aws/getStack').getStack,
      getBucketName         = require('../aws/getBucketName').getBucketName,
      updateTemplate        = require('../aws/updateTemplate').updateTemplate,
      deployAPI             = require('../aws/deployAPI').deployAPI,
      uploadNFXFiles        = require('../aws/uploadNFXFiles').uploadNFXFiles,
      updateStackToVersion  = require('../aws/updateStackToVersion').updateStackToVersion,
      handleInterrupt       = require('../aws/handleInterrupt').handleInterrupt;

module.exports = (nfx) => {
  consoleLog('info', 'Checking stack...');

  // FIXME: It should be configurable.
  nfx.stage = 'staging';

  let startTime = new Date().getTime();
  nfx.state = 'CREATING';
  getStack(nfx)
    .then((updatedNFX) => {
      const endTime = new Date().getTime();
      console.log(`fetching stack took: ${(endTime - startTime)/1000}s`);
      startTime = endTime;
      return getBucketName(updatedNFX);
    })
    .then((updatedNFX) => {
      const endTime = new Date().getTime();
      console.log(`getting bucket took: ${(endTime - startTime)/1000}s`);
      startTime = endTime;
      return compressAndCompare(updatedNFX);
    })
    .then((updatedNFX) => {
      nfx.state = 'UPLOADING';
      const endTime = new Date().getTime();
      console.log(`compressing and comparing took: ${(endTime - startTime)/1000}s`);
      startTime = endTime;
      return uploadFunctions(updatedNFX);
    })
    .then((updatedNFX) => { // Takes at least 30 secs
      nfx.state = 'UPDATING';
      const endTime = new Date().getTime();
      console.log(`uploading functions took: ${(endTime - startTime)/1000}s`);
      startTime = endTime;
      return updateTemplate(updatedNFX);
    })
    .then((updatedNFX) => { // Takes at least 30 secs
      nfx.state = 'DEPLOYING';
      const endTime = new Date().getTime();
      console.log(`updating stack took: ${(endTime - startTime)/1000}s`);
      startTime = endTime;
      return deployAPI(updatedNFX, {});
    })
    .then((updatedNFX) => {
      nfx.state = 'SAVING';
      const endTime = new Date().getTime();
      console.log(`uploading stack took: ${(endTime - startTime)/1000}s`);
      startTime = endTime;

      nfx.nfxJSON.active_version = nfx.version;
      return uploadNFXFiles(updatedNFX);
    })
    .catch((err) => {
      if (err.stack) {
        consoleLog('err', err.stack);
      } else {
        consoleLog('err', err);
      }
    });

  process.on('SIGINT', function () {
    handleInterrupt(nfx);
  });
}
