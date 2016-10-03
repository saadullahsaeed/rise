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
  getStack(nfx)
    .then(() => {
      return describeStackResource(nfx);
    })
    .then((stackResourceDetail) => {
      return compressAndUpload(nfx, stackResourceDetail.PhysicalResourceId);
    })
    .then(() => {
      return deployFunctions(nfx);
    })
    .then((result) => {
      return uploadAPITemplate(nfx, result.cfTemplate, result.outputs);
    })
    .then((cfContent) => {
      return updateAPIs(nfx, cfContent);
    })
    .then((cfContent) => {
      return deployAPIs(nfx, cfContent);
    })
    .catch((err) => {
      consoleLog('err', err);
    });
}
