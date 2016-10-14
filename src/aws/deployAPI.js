'use strict';

const path = require('path'),
      log = require('../utils/log'),
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports = function deployAPI(nfx, options) {
  const cf = nfx.aws.cf;

  nfx.cfTemplate.Resources = Object.assign({}, nfx.cfTemplate.Resources, getDeploymentResource(nfx.version, nfx.stage, options.rollback));
  nfx.cfTemplate.Outputs = Object.assign({}, nfx.cfTemplate.Outputs, getDeploymentOutput(nfx.stage));

  return cf.updateStack({
    StackName: nfx.stackName,
    TemplateBody: JSON.stringify(nfx.cfTemplate, null, 2),
    Capabilities: ['CAPABILITY_IAM']
  }).promise()
    .then(function() {
      return waitForDeploy(nfx);
    })
    .catch((err) => {
      if (err.message && err.message.indexOf('No updates are to be performed') !== -1) {
        log.info("No updates on deployment. Proceed to the next step");
        return Promise.resolve(nfx);
      } else {
        return Promise.reject(err);
      }
    });
};

function waitForDeploy(nfx) {
  const cf = nfx.aws.cf;

  nfx.state = 'DEPLOYING';
  log.info(`Updating stack [${nfx.stackName}] to deploy API...`);
  return cf.waitFor('stackUpdateComplete', { StackName: nfx.stackName }).promise()
    .then(() => {
      log.info(`Updated stack [${nfx.stackName}] to deploy API...`);
      nfx.nfxJSON.active_version = nfx.version;
      nfx.state = 'DEPLOYED';
      return Promise.resolve(nfx);
    });
}

function getDeploymentResource(version, stage, rollback) {
  const cfDeploymentContent = fsReadFile(path.join(__dirname, 'cf-deployment.json')),
        result = {};

  let deploymentResourceName = `NFXDeployment${version}`;
  if (rollback) {
    // If we don't create new deployment tag with new name,
    // it will not deploy since there is no changes on deployment tag.
    deploymentResourceName = `${deploymentResourceName}Rollback`;
  }

  result[deploymentResourceName] = JSON.parse(cfDeploymentContent.replace('$STAGE_NAME', stage));
  return result;
}

function getDeploymentOutput(stage) {
  const cfBaseURLOutputContent = fsReadFile(path.join(__dirname, 'cf-api-base-url-output.json')),
        result = {};

  result.NFXBaseURL = JSON.parse(cfBaseURLOutputContent.replace('$STAGE_NAME', stage));
  return result;
}
