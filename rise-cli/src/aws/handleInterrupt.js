'use strict';

const log = require('../utils/log'),
      cancelUpdateStack = require('../aws/cancelUpdateStack'),
      rollback = require('../aws/rollback');

module.exports = function handleInterrupt(session) {
  // remove compressed files
  log.info(`SIGINT fired at ${session.state}`);
  if (session.state === 'CREATING') {
    log.info('Creating stack is still in progress.');
    process.exit(1);
  } else if (session.state === 'UPDATING') {
    // Users could send Ctrl+c again.
    session.state = 'REVERTING';
    cancelUpdateStack(session)
      .then(function(session) {
        if (session.state === 'UNEXPECTEDLY_UPDATED') {
          // When the stack is updated before cancelling,
          // we update the stack to previous version
          // Nothing to rollback if this is the first deployment.
          if (session.version !== 'v1') {
            const activeVersion = session.riseJSON.active_version;
            log.info(`The deployment have been cancelled. Rolling back to "${activeVersion}"`);
            rollback(session, activeVersion).then(() => {
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
  } else if (session.state === 'DEPLOYING' /* || session.state === 'PINGING' */) {
    cancelUpdateStack(session)
      .then(function(session) {
        // Nothing to rollback if this is the first deployment.
        if (session.version !== 'v1') {
          const activeVersion = session.riseJSON.active_version;
          log.info(`the deployment have been cancelled. Rolling back to "${activeVersion}"`);
          return rollback(session, activeVersion);
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
  } else if (session.state === 'CANCELLING' || session.state === 'UNEXPECTEDLY_UPDATED') {
    log.info('Reverting is in progress ... Please wait until reverting is done');
  } else {
    process.exit(1);
  }
};

