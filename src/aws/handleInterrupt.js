'use strict';

const fs                   = require('fs'),
      log = require('../utils/log'),
      cancelUpdateTemplate = require('../aws/cancelUpdateTemplate').cancelUpdateTemplate,
      rollback = require('../aws/rollback');

module.exports.handleInterrupt = function(nfx) {
  console.log(`SIGINT fired at ${nfx.state}`);
  if (nfx.state === 'UPDATING') {
    // Users could send Ctrl+c again.
    nfx.state = 'REVERTING';
    console.log('Canceling updating stack');
    cancelUpdateTemplate(nfx)
      .then(function(nfx) {
        if (nfx.state == 'UNEXPECTEDLY_UPDATED') {
          // When the stack is updated before cancelling,
          // we update the stack to previous version
          // Nothing to rollback if this is the first deployment.
          if (nfx.version !== 'v1') {
            const activeVersion = nfx.nfxJSON.active_version;
            log.info(`the deployment have been cancelled. Rolling back to "${activeVersion}"`);
            rollback(nfx, activeVersion).then( () => {
              console.log('Successfully rolled back.');
              process.exit(1);
            }).catch(function(err) {
              if (err.stack) {
                log.error(err.stack);
              } else {
                log.error(err);
              }
              process.exit(1);
            });
          }
        } else {
          log.info('cancelled');
          process.exit(1);
        }
      })
      .catch(function(err) {
        if (err.stack) {
          log.error(err.stack);
        } else {
          log.error(err);
        }
        process.exit(1);
      });
  } else if (nfx.state === 'DEPLOYING') {
    nfx.state = 'REVERTING';
    console.log('Canceling deploying');
    cancelUpdateTemplate(nfx)
      .then(function(nfx) {
        // Nothing to rollback if this is the first deployment.
        if (nfx.version !== 'v1') {
          const activeVersion = nfx.nfxJSON.active_version;
          log.info(`the deployment have been cancelled. Rolling back to "${activeVersion}"`);
          return rollback(nfx, activeVersion);
        }
      })
      .then(function() {
        console.log('Successfully rolled back.');
        process.exit(1);
      })
      .catch(function(err) {
        if (err.stack) {
          log.error(err.stack);
        } else {
          log.error(err);
        }
        process.exit(1);
      });
  } else if (nfx.state === 'REVERTING' || nfx.state === 'UNEXPECTEDLY_UPDATED') {
    console.log('Reverting is in progress ... Please wait until reverting is done');
  } else {
    process.exit(1);
  }
}

