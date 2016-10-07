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
      cancelUpdateTemplate  = require('../aws/cancelUpdateTemplate').cancelUpdateTemplate;

module.exports = (nfx) => {
  consoleLog('info', 'Checking stack...');

  const nfxFolder = '.nfx';
  const nfxFolderStat = fsStat(nfxFolder);
  if (!nfxFolderStat) {
    fs.mkdirSync(nfxFolder, 0o755);
  }

  const nfxVersionPath = path.join(nfxFolder, 'VERSION');
  const nfxVersionStat = fsStat(nfxVersionPath);
  if (!nfxVersionStat) {
    fs.writeFileSync(nfxVersionPath, 'v0', { encoding: 'utf8' });
  }

  // FIXME: This operation should be atomic.
  // We should lock the access to the version file while deploying
  // We can use https://github.com/npm/lockfile if it works with windows well
  const currentVersion = fs.readFileSync(nfxVersionPath, { encoding: 'utf8' });
  // Version format is v1234 for now
  const newVersion = `v${(parseInt(currentVersion.substr(1) || 0) + 1)}`;
  nfx.version = newVersion

  // FIXME: It should be configurable.
  nfx.stage = 'staging';
  console.log(`deploying ${newVersion}...`);

  let startTime = new Date().getTime();
  let state = 'FETCHING';
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
      state = 'UPLOADING';
      const endTime = new Date().getTime();
      console.log(`compressing and comparing took: ${(endTime - startTime)/1000}s`);
      startTime = endTime;
      return uploadFunctions(updatedNFX);
    })
    .then((updatedNFX) => { // Takes at least 30 secs
      state = 'UPDATING';
      const endTime = new Date().getTime();
      console.log(`uploading functions took: ${(endTime - startTime)/1000}s`);
      startTime = endTime;
      return updateTemplate(updatedNFX);
    })
    .then((updatedNFX) => { // Takes at least 30 secs
      state = 'DEPLOYING';
      const endTime = new Date().getTime();
      console.log(`updating stack took: ${(endTime - startTime)/1000}s`);
      startTime = endTime;
      return deployAPI(updatedNFX, {});
    })
    .then((updatedNFX) => {
      state = 'SAVING';
      const endTime = new Date().getTime();
      console.log(`uploading stack took: ${(endTime - startTime)/1000}s`);
      startTime = endTime;
      return uploadNFXFiles(updatedNFX);
    })
    .then((updatedNFX) => {
      const endTime = new Date().getTime();
      console.log(`saving template took: ${(endTime - startTime)/1000}s`);
      consoleLog('info', `Successfully deployed your project. Version: ${nfx.version}`)
      fs.writeFileSync(nfxVersionPath, nfx.version, { encoding: 'utf8' });
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
    if (state === 'UPDATING') {
      console.log('canceling updating stack');
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
      console.log('rolling back to previous version');
      process.exit(1);
    }
  });
}
