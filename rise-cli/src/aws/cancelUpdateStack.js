'use strict';

const log = require('../utils/log');

module.exports = function cancelUpdateStack(session) {
  return new Promise((resolve, reject) => {
    const params = { StackName: session.stackName },
          cf = session.aws.cf,
          checkStackState = function(err, data) {
            if (err) {
              reject(err);
              return;
            }

            const status = data.Stacks[0].StackStatus;
            if (status !== 'UPDATE_ROLLBACK_COMPLETE') {
              setTimeout(function() {
                cf.describeStacks(params, checkStackState);
              }, 5000);
            } else {
              session.state = 'CANCELLED';
              resolve(session);
            }
          };

    session.state = 'CANCELLING';
    cf.cancelUpdateStack(params, function(err/*, data*/) {
      if (err) {
        if (err.message && err.message.indexOf('CancelUpdateStack cannot be called from current stack status') !== -1) {
          log.info('The stack already has been updated.');
          session.state = 'UNEXPECTEDLY_UPDATED';
          resolve(session);
          return;
        } else {
          reject(err);
          return;
        }
      }

      log.info('Cancelling Updating stack...');
      cf.describeStacks(params, checkStackState);
    });
  });
};
