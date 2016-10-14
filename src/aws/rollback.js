'use strict';

const log = require('../utils/log');

module.exports = function rollback(nfx, version) {
  return new Promise((resolve, reject) => {
    nfx.state = 'UPDATING';

    const cf = nfx.awsSDK.cf;
    const params = {
      StackName: nfx.stackName,
      TemplateURL: `https://s3-${nfx.region}.amazonaws.com/${nfx.bucketName}/versions/${version}/aws/cf.json`,
      Capabilities: ['CAPABILITY_IAM']
    };
    const req = cf.updateStack(params);

    log.info(`Updating stack to version ${version}...`);
    req.on('success', function(resp) {
      log.info(`Successfully made a request to update stack to ${version}...`);
      cf.waitFor('stackUpdateComplete',
        { StackName: nfx.stackName },
        function(err, data) {
        if (err) {
          log.error(`Failed to update stack to version ${version}: ${err}`);
          return;
        }

        nfx.version = version;
        log.info(`Successfully updated stack to version ${version}`);
        resolve(nfx);
      });
    });

    req.on('error', function(err, data) {
      log.error(`Errors on making a request to update stack to version ${version}: ${err}`);
      reject(err);
    });

    req.send();
  });
}
