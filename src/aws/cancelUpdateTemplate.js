'use strict';

const log = require('../utils/log');

module.exports = function cancelUpdateTemplate(nfx) {
  return new Promise((resolve, reject) => {
    const params = { StackName: nfx.stackName },
          cf = nfx.aws.cf,
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
              nfx.state = 'CANCELLED';
              resolve(nfx);
            }
          },
          req = cf.cancelUpdateStack(params);

    nfx.state = 'CANCELLING';
    req.on('success', function(/* resp */) {
      log.info('Cancelling Updating stack...');
      cf.describeStacks(params, checkStackState);
    });

    req.on('error', function(err/*,  data */) {
      // This is when the update is done before the request was made
      if (err.message && err.message.indexOf('CancelUpdateStack cannot be called from current stack status') !== -1) {
        log.info('The stack already has been updated.');
        nfx.state = 'UNEXPECTEDLY_UPDATED';
        resolve(nfx);
      } else {
        reject(err);
      }
    });

    req.send();
  });
};
