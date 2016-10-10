'use strict';

const fs                   = require('fs'),
      consoleLog           = require('../utils/consoleLog').consoleLog,
      cancelUpdateTemplate = require('../aws/cancelUpdateTemplate').cancelUpdateTemplate,
      updateStackToVersion = require('../aws/updateStackToVersion').updateStackToVersion;

module.exports.handleInterrupt = function(nfx) {
  console.log(`SIGINT fired at ${nfx.state}`);
  if (nfx.state === 'UPDATING') {
    // Users could send Ctrl+c again.
    nfx.state = 'REVERTING';
    console.log('Canceling updating stack');
    cancelUpdateTemplate(nfx)
      .then(function(updatedNFX) {
        if (updatedNFX.state == 'UNEXPECTEDLY_UPDATED') {
          // When the stack is updated before cancelling,
          // we update the stack to previous version
          // Nothing to rollback if this is the first deployment.
          if (updatedNFX.version !== 'v1') {
            consoleLog('info', `the deployment have been cancelled. Rolling back to "${updatedNFX.previousVersion}"`);
            updatedNFX.version = updatedNFX.previousVersion;
            updateStackToVersion(updatedNFX).then( () => {
              console.log('Successfully rolled back.');
              process.exit(1);
            }).catch(function(err) {
              if (err.stack) {
                consoleLog('err', err.stack);
              } else {
                consoleLog('err', err);
              }
              process.exit(1);
            });
          }
        } else {
          consoleLog('info', 'cancelled');
          process.exit(1);
        }
      })
      .catch(function(err) {
        if (err.stack) {
          consoleLog('err', err.stack);
        } else {
          consoleLog('err', err);
        }
        process.exit(1);
      });
  } else if (nfx.state === 'DEPLOYING') {
    nfx.state = 'REVERTING';
    console.log('Canceling deploying');
    cancelUpdateTemplate(nfx)
      .then(function(updatedNFX) {
        // Nothing to rollback if this is the first deployment.
        if (updatedNFX.version !== 'v1') {
          consoleLog('info', `the deployment have been cancelled. Rolling back to "${updatedNFX.previousVersion}"`);
          updatedNFX.version = updatedNFX.previousVersion;
          return updateStackToVersion(updatedNFX);
        }
      })
      .then(function() {
        console.log('Successfully rolled back.');
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
  } else if (nfx.state === 'REVERTING' || nfx.state === 'UNEXPECTEDLY_UPDATED') {
    console.log('Reverting is in progress ... Please wait until reverting is done');
  } else {
    process.exit(1);
  }
}

