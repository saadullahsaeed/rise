'use strict';

const fs         = require('fs'),
      path       = require('path'),
      log = require('../utils/log'),
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
      if (status !== 'UPDATE_ROLLBACK_COMPLETE') {
        setTimeout(function() {
          cf.describeStacks(params, checkStackState);
        }, 5000);
      } else {
        resolve(nfx);
      }
    };

    log.info('Canceling Updating stack...');
    req.on('success', function(resp) {
      cf.describeStacks(params, checkStackState);
    });

    req.on('error', function(err, data) {
      // This is when the update is done before the request was made
      if (err.message && err.message.indexOf('CancelUpdateStack cannot be called from current stack status') !== -1) {
        log.info('The stack already has updated.');
        nfx.state = 'UNEXPECTEDLY_UPDATED';
        resolve(nfx);
      } else {
        reject(err);
      }
    });

    req.send();
  });
}

