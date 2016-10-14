"use strict";

const log = require('../utils/log'),
      compressAndCompare = require('../aws/compressAndCompare'),
      uploadFunctions       = require('../aws/uploadFunctions').uploadFunctions,
      getStack = require('../aws/getStack'),
      getBucket = require('../aws/getBucket'),
      fetchVersion = require('../aws/fetchVersion'),
      updateTemplate        = require('../aws/updateTemplate').updateTemplate,
      deployAPI             = require('../aws/deployAPI').deployAPI,
      uploadNFXFiles        = require('../aws/uploadNFXFiles').uploadNFXFiles,
      handleInterrupt       = require('../aws/handleInterrupt').handleInterrupt;

module.exports = (nfx) => {
  // FIXME: It should be configurable.
  nfx.stage = 'staging';
  nfx.state = 'CREATING';

  getBucket(nfx)
    .then(getStack(nfx))
    .then(fetchVersion(nfx))
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
