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

  // To catch Ctrl+c
  process.on('SIGINT', function () {
    console.log(`SIGINT fired at ${state}`);
    if (state === 'CREATING') {
      // TODO: Delete the stack
    } else if (state === 'UPDATING') {
      // Users could send Ctrl+c again.
      state = 'ROLLING_BACK';
      console.log('Canceling updating stack');
      cancelUpdateTemplate(nfx)
        .then(function() {
          console.log('cancelled');
          process.exit(1);
        })
        .catch(function(err) {
          if (err.stack) {
            consoleLog('err', err.stack);
          } else {
            consoleLog('err', err);
          }
          process.exit(1);
        });
    } else if (state === 'DEPLOYING') {
      // Nothing to rollback if this is the first deployment
      // 1. Cancel deployment
      // 2. Rollback to previous version
      state = 'ROLLING_BACK';

      console.log('Canceling deploying');
      cancelUpdateTemplate(nfx)
        .then(function(updatedNFX) {
          console.log('the deployment have been cancelled. Rolling back to current version');
          if (currentVersion !== 'v0') {
            updatedNFX.version = currentVersion
            return updateStackToVersion(updatedNFX);
          }
        })
        .then(function() {
          console.log('Successfully rolled back');
          process.exit(1);
        })
        .catch(function(err) {
          if (err.stack) {
            consoleLog('err', err.stack);
          } else {
            consoleLog('err', err);
          }
          process.exit(1);
        });
    }
  });
}
