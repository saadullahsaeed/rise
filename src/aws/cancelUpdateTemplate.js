'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports.cancelUpdateTemplate = function(nfx) {
  return new Promise((resolve, reject) => {
    const params = { StackName: nfx.stackName },
          cf = nfx.awsSDK.cf,
          req = cf.cancelUpdateStack(params);

    const checkStackState = function(err, data) {
      if (err) {
        reject(err);
        return;
      }

      var status = data.Stacks[0].StackStatus
      if (status != 'UPDATE_ROLLBACK_COMPLETE') {
        setTimeout(function() {
          cf.describeStacks(params, checkStackState);
        }, 5000);
      } else {
        resolve(nfx);
      }
    };

    consoleLog('info', `Canceling Updating stack...`);
    req.on('success', function(resp) {
      cf.describeStacks(params, checkStackState);
    });

    req.on('error', function(err, data) {
      reject(err);
    });

    req.send();
  });
}

