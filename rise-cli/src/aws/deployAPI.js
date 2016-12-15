'use strict';

const path = require('path'),
      log = require('../utils/log'),
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports = function deployAPI(session, options) {
  const cf = session.aws.cf;

  session.aws.cfTemplate.Resources = Object.assign({}, session.aws.cfTemplate.Resources, getDeploymentResource(session.version, session.stage, options.rollback));
  session.aws.cfTemplate.Outputs = Object.assign({}, session.aws.cfTemplate.Outputs, getDeploymentOutput(session.stage));

  return cf.updateStack({
    StackName: session.stackName,
    TemplateBody: JSON.stringify(session.aws.cfTemplate, null, 2),
    Capabilities: ['CAPABILITY_IAM']
  }).promise()
    .then(function() {
      return waitForDeploy(session);
    })
    .catch((err) => {
      if (err.message && err.message.indexOf('No updates are to be performed') !== -1) {
        log.info("No updates on deployment. Proceed to the next step");
        return Promise.resolve(session);
      } else {
        return Promise.reject(err);
      }
    });
};

function waitForDeploy(session) {
  const cf = session.aws.cf;

  session.state = 'DEPLOYING';
  log.info(`Updating stack [${session.stackName}] to deploy API...`);
  return cf.waitFor('stackUpdateComplete', { StackName: session.stackName }).promise()
    .then((data) => {
      const output = data.Stacks[0].Outputs[0];
      log.info(`Updated stack [${session.stackName}] to deploy API...`);
      log.info(`${output.OutputKey}: ${output.OutputValue}`);
      session.riseJSON.active_version = session.version;
      session.state = 'DEPLOYED';
      return Promise.resolve(session);
    });
}

function getDeploymentResource(version, stage, rollback) {
  const cfDeploymentContent = fsReadFile(path.join(__dirname, 'cf-deployment.json')),
        result = {};

  let deploymentResourceName = `RiseDeployment${version}`;
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

  result.RiseBaseURL = JSON.parse(cfBaseURLOutputContent.replace('$STAGE_NAME', stage));
  return result;
}
