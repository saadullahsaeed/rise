"use strict";

const fs                    = require('fs'),
      path                  = require('path'),
      fsStat                = require('../utils/fs').fsStat,
      consoleLog            = require('../utils/consoleLog').consoleLog,
      compressAndCompare    = require('../aws/compressAndCompare').compressAndCompare,
      uploadFunctions       = require('../aws/uploadFunctions').uploadFunctions,
      getStack              = require('../aws/getStack').getStack,
      getBucketName         = require('../aws/getBucketName').getBucketName,
      getStackTemplate      = require('../aws/getStackTemplate').getStackTemplate,
      updateTemplate        = require('../aws/updateTemplate').updateTemplate,
      uploadNFXFiles        = require('../aws/uploadNFXFiles').uploadNFXFiles;

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
  nfx.version = `v${(parseInt(currentVersion.substr(1) || 0) + 1)}`;

  // FIXME: It should be configurable.
  nfx.stage = 'staging';

  getStack(nfx)
    .then((updatedNFX) => {
      return getStackTemplate(updatedNFX);
    })
    .then((updatedNFX) => {
      return getBucketName(updatedNFX);
    })
    .then((updatedNFX) => {
      return compressAndCompare(updatedNFX);
    })
    .then((updatedNFX) => {
      return uploadFunctions(updatedNFX);
    })
    .then((updatedNFX) => {
      return updateTemplate(updatedNFX);
    })
    .then((updatedNFX) => {
      return uploadNFXFiles(updatedNFX);
    })
    .then((updatedNFX) => {
      consoleLog('info', `Successfully deployed your project. Version: ${nfx.version}`)
      fs.writeFileSync(nfxVersionPath, nfx.version, { encoding: 'utf8' });
    })
    .catch((err) => {
      consoleLog('err', err);
    });
}
