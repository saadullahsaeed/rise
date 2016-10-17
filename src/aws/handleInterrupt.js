'use strict';

const log = require('../utils/log'),
      cancelUpdateTemplate = require('../aws/cancelUpdateTemplate'),
      rollback = require('../aws/rollback');

module.exports = function handleInterrupt(nfx) {
  log.info(`SIGINT fired at ${nfx.state}`);
  if (nfx.state === 'CREATING') {
    log.info('Creating stack is still in progress. Please run `nfx destroy`.');
    process.exit(1);
  } else if (nfx.state === 'UPDATING') {
    // Users could send Ctrl+c again.
    nfx.state = 'REVERTING';
    cancelUpdateTemplate(nfx)
      .then(function(nfx) {
        if (nfx.state === 'UNEXPECTEDLY_UPDATED') {
          // When the stack is updated before cancelling,
          // we update the stack to previous version
          // Nothing to rollback if this is the first deployment.
          if (nfx.version !== 'v1') {
            const activeVersion = nfx.nfxJSON.active_version;
            log.info(`The deployment have been cancelled. Rolling back to "${activeVersion}"`);
            rollback(nfx, activeVersion).then(() => {
              log.info('Successfully rolled back.');
              process.exit(1);
            }).catch(function(err) {
              log.error(err);
              process.exit(1);
            });
          } else {
            log.info('Updating the stack has been completed. The deployment has been cancelled');
            process.exit(1);
          }
        } else {
          log.info('Updating the stack has been cancelled.');
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
        log.info('Successfully rolled back');
        process.exit(1);
      })
      .catch(function(err) {
        log.error(err);
        process.exit(1);
      });
  } else if (nfx.state === 'CANCELLING' || nfx.state === 'UNEXPECTEDLY_UPDATED') {
    log.info('Reverting is in progress ... Please wait until reverting is done');
  } else {
    process.exit(1);
  }
};

