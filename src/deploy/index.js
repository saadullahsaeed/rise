"use strict";

const fs                    = require('fs'),
      path                  = require('path'),
      fsStat                = require('../utils/fs').fsStat,
      log = require('../utils/log'),
      compressAndCompare    = require('../aws/compressAndCompare').compressAndCompare,
      uploadFunctions       = require('../aws/uploadFunctions').uploadFunctions,
      getStack              = require('../aws/getStack').getStack,
      getBucket             = require('../aws/getBucket').getBucket,
      updateTemplate        = require('../aws/updateTemplate').updateTemplate,
      deployAPI             = require('../aws/deployAPI').deployAPI,
      uploadNFXFiles        = require('../aws/uploadNFXFiles').uploadNFXFiles,
      updateStackToVersion  = require('../aws/updateStackToVersion').updateStackToVersion,
      handleInterrupt       = require('../aws/handleInterrupt').handleInterrupt;

module.exports = (nfx) => {
  // FIXME: It should be configurable.
  nfx.stage = 'staging';
  nfx.state = 'CREATING';

  getBucket(nfx)
    .then(getStack(nfx))
    .then(compressAndCompare(nfx))
    .then(uploadFunctions(nfx))
    .then(updateTemplate(nfx)) // Takes at least 30 secs
    .then(deployAPI(nfx, {})) // Takes at least 30 secs
    .then(uploadNFXFiles(nfx))
    .catch(log.error);

  process.on('SIGINT', function () {
    handleInterrupt(nfx);
  });
};
