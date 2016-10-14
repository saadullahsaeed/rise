'use strict';

const path = require('path'),
      titlecase = require('../utils/stringHelper'),
      log = require('../utils/log'),
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports = function updateStack(nfx) {
  const stackName = nfx.stackName,
        bucketName = nfx.bucketName,
        version = nfx.version,
        functions = nfx.functions,
        paths = nfx.api.paths;

  nfx.cfTemplate = getBaseTemplate(stackName);
  nfx.cfTemplate.Resources = Object.assign({}, nfx.cfTemplate.Resources, getFunctionResources(bucketName, version, functions));
  nfx.cfTemplate.Resources = Object.assign({}, nfx.cfTemplate.Resources, getAPIResources(paths));

  nfx.state = 'UPDATING';
  return nfx.aws.cf.updateStack({
    StackName: nfx.stackName,
    TemplateBody: JSON.stringify(nfx.cfTemplate, null, 2),
    Capabilities: ['CAPABILITY_IAM']
  }).promise()
    .then(function() {
      return waitForUpdate(nfx);
    })
    .catch(function(err) {
      if (err.message) {
        if (err.message.indexOf('No updates are to be performed') !== -1) {
          log.info('No updates on updating stack. Proceed to the next step');
          return Promise.resolve(nfx);
        } else if (nfx.state !== 'UPDATING' && err.message.indexOf('Resource is not in the state stackUpdateComplete') !== -1) {
          // If a user cancelled deploying, it might get "ResourceNotReady: Resource is not in the state stackUpdateComplete"
          // Since it is rolling back
          // We need to share a deployment state globally and ignore the error when it is on canceling
          return Promise.resolve(nfx);
        }
      } else {
        return Promise.reject(err);
      }
    });
};

function waitForUpdate(nfx) {
  const cf = nfx.aws.cf;

  log.info(`Updating stack [${nfx.stackName}]...`);
  return cf.waitFor('stackUpdateComplete', { StackName: nfx.stackName }).promise()
    .then(() => {
      log.info(`Updated stack [${nfx.stackName}]...`);
      nfx.state = 'UPDATED';
      return Promise.resolve(nfx);
    });
}

function getBaseTemplate(stackName) {
  const content = fsReadFile(path.join(__dirname, 'cf-base.json'));
  const cfTemplate = JSON.parse(content);

  const cfRestAPIContent = fsReadFile(path.join(__dirname, 'cf-restapi.json'));
  const cfRestAPIJSON = JSON.parse(cfRestAPIContent.replace('$NAME', `${stackName} API`));
  cfTemplate.Resources.NFXApi = cfRestAPIJSON;

  return cfTemplate;
}

function getFunctionResources(bucketName, version, functions) {
  const cfFunctionContent = fsReadFile(path.join(__dirname, 'cf-lambda-function.json'));
  const cfFunctionVersionContent = fsReadFile(path.join(__dirname, 'cf-lambda-version.json'));
  const cfFuncRoleContent = fsReadFile(path.join(__dirname, 'cf-lambda-role.json'));
  const resources = {};

  const defaultSetting = functions.default;
  for (const funcPath in functions) {
    if (funcPath === 'default') {
      continue;
    }

    const func = functions[funcPath];
    const funcName = titlecase(funcPath, path.sep);
    const s3Key = `versions/${version}/functions/${funcName}.zip`;
    const timeout = func.timeout || defaultSetting.timeout;
    const memorySize = func.memory || defaultSetting.memory;

    resources[funcName] = JSON.parse(
      cfFunctionContent
      .replace('$HANDLER', func.handler)
      .replace('$S3KEY', s3Key)
      .replace('$S3BUCKET', bucketName)
      .replace('$TIMEOUT', timeout)
      .replace('$MEMORY_SIZE', memorySize)
    );

    resources[`${funcName}Version`] = JSON.parse(
      cfFunctionVersionContent.replace('$FUNCTION_NAME', funcName)
    );

    resources[`${funcName}Role`] = JSON.parse(
      cfFuncRoleContent.replace('$FUNCTION_NAME', funcName)
    );
  }

  return resources;
}

function getAPIResources(paths) {
  const resourceTemplate = fsReadFile(path.join(__dirname, 'cf-api-resource.json'));
  const methodTemplate = fsReadFile(path.join(__dirname, 'cf-api-method.json'));
  const corsMethodTemplate = fsReadFile(path.join(__dirname, 'cf-api-cors.json'));
  const pathTree = {
    name: 'NFXApiResource',
    isRoot: true,
    children: {}
  };

  let result = {};
  for (const p in paths) {
    let trimedPath = p;
    if (trimedPath[0] === '/') {
      trimedPath = trimedPath.substr(1);
    }

    if (trimedPath[trimedPath.length - 1] === '/') {
      trimedPath = trimedPath.substr(0, p.length - 1);
    }

    const tokens = trimedPath.split('/');
    const methods = paths[p];

    let parent = pathTree;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const name = parent.name + titlecase(token);

      // This is when the path is '/'
      // We are not sure that '/' comes first.
      if (token === '') {
        result = Object.assign({}, result, createAPIMethod(methodTemplate, corsMethodTemplate, parent, token, methods));
        continue;
      }

      if (!parent.children[token]) {
        parent.children[token] = { name, isRoot: false, children: {} };
        result = Object.assign({}, result, createAPIResource(resourceTemplate, parent, name, token));
      }

      // When it is last token, it creates methods for the api resource
      if (i === (tokens.length - 1)) {
        result = Object.assign({}, result, createAPIMethod(methodTemplate, corsMethodTemplate, parent.children[token], token, methods));
      }

      parent = parent.children[token];
    }
  }

  return result;
}

function createAPIResource(resourceTemplate, parent, name, p) {
  const result = {};
  const methodJSON = JSON.parse(resourceTemplate.replace('$LAST_PATH', p));
  if (parent.isRoot) {
    methodJSON.Properties.ParentId = { 'Fn::GetAtt': ['NFXApi', 'RootResourceId'] };
  } else {
    methodJSON.Properties.ParentId = { Ref: parent.name };
  }

  result[name] = methodJSON;
  return result;
}

function createAPIMethod(methodTemplate, corsMethodTemplate, res, urlPath, methods) {
  const result = {};
  const corsMethods = [];

  for (const m in methods) {
    const methodResourceName = res.name + m.toUpperCase();
    const method = methods[m];
    const methodJSON = JSON.parse(methodTemplate
      .replace('$METHOD', m.toUpperCase())
      .replace('$FUNCTION_NAME', titlecase(method['x-nfx'].handler, path.sep))
    );

    if (res.isRoot) {
      methodJSON.Properties.ResourceId = { 'Fn::GetAtt': ['NFXApi', 'RootResourceId'] };
    } else {
      methodJSON.Properties.ResourceId = { Ref: res.name };
    }
    result[methodResourceName] = methodJSON;
    if (method['x-nfx'].cors) {
      corsMethods.push(m.toUpperCase());
    }
  }

  if (corsMethods.length > 0) {
    const methodResourceName = `${res.name}OPTIONS`;
    const methodJSON = JSON.parse(corsMethodTemplate.replace(/\$CORS_METHODS/g, corsMethods.join(',')));
    if (res.isRoot) {
      methodJSON.Properties.ResourceId = { 'Fn::GetAtt': ['NFXApi', 'RootResourceId'] };
    } else {
      methodJSON.Properties.ResourceId = { Ref: res.name };
    }
    result[methodResourceName] = methodJSON;
  }

  return result;
}
