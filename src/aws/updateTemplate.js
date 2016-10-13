'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      yaml       = require('js-yaml'),
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports.updateTemplate = function(nfx) {
  return new Promise((resolve, reject) => {
    setBaseTemplate(nfx);
    setFunctions(nfx);
    setAPIs(nfx);

    const req = nfx.awsSDK.cf.updateStack({
      StackName: nfx.stackName,
      TemplateBody: JSON.stringify(nfx.cfTemplate, null, 2),
      Capabilities: ['CAPABILITY_IAM']
    });

    req.on('success', function(resp) {
      consoleLog('info', `Updating stack...`);
      nfx.awsSDK.cf.waitFor('stackUpdateComplete',
        { StackName: nfx.stackName },
        function(err, data) {
          if (err) {
            reject(err);
            return;
          }

          consoleLog('info', `Successfully updated stack.`);
          resolve(nfx);
        }
      );
    });

    req.on('error', function(err, data) {
      if (err.message && err.message.indexOf('No updates are to be performed') !== -1) {
        consoleLog('info', "No updates on updating stack. Proceed to the next step");
        resolve(nfx);
      } else {
        // TODO: If a user cancelled deploying, it might get "ResourceNotReady: Resource is not in the state stackUpdateComplete"
        // Since it is rolling back
        // We need to share a deployment state globally and ignore the error when it is on canceling
        reject(err);
      }
    });

    req.send();
  });
}

function setBaseTemplate(nfx) {
  const content = fsReadFile(path.join(__dirname, 'cf-base.json'));
  const baseContentJSON = JSON.parse(content);
  nfx.cfTemplate = baseContentJSON;

  const cfRestAPIContent = fsReadFile(path.join(__dirname, 'cf-restapi.json'));
  const cfRestAPIJSON = JSON.parse(
    cfRestAPIContent.replace('$NAME', `${nfx.stackName} API`)
  );
  nfx.cfTemplate.Resources.NFXApi = cfRestAPIJSON;
}

function setFunctions(nfx) {
  const cfFunctionContent = fsReadFile(path.join(__dirname, 'cf-lambda-function.json'));
  const cfFunctionVersionContent = fsReadFile(path.join(__dirname, 'cf-lambda-version.json'));
  const cfFuncRoleContent = fsReadFile(path.join(__dirname, 'cf-lambda-role.json'));

  const defaultSetting = nfx.functions.default;
  for (let funcPath in nfx.functions) {
    if (funcPath === 'default') {
      continue;
    }

    const func = nfx.functions[funcPath];
    // TODO: Titlecase function name
    const funcName = funcPath.replace(path.sep, '');
    const s3Key = `versions/${nfx.version}/functions/${funcName}.zip`;
    const timeout = func.timeout || defaultSetting.timeout;
    const memorySize = func.memory || defaultSetting.memory;

    nfx.cfTemplate.Resources[funcName] = JSON.parse(
      cfFunctionContent
      .replace('$HANDLER', func.handler)
      .replace('$S3BUCKET', nfx.bucketName)
      .replace('$S3KEY', s3Key)
      .replace('$TIMEOUT', timeout)
      .replace('$MEMORY_SIZE', memorySize)
    );

    nfx.cfTemplate.Resources[`${funcName}Version`] = JSON.parse(
      cfFunctionVersionContent.replace('$FUNCTION_NAME', funcName)
    );

    nfx.cfTemplate.Resources[`${funcName}Role`] = JSON.parse(cfFuncRoleContent.replace('$FUNCTION_NAME', funcName));
  }
}

function setAPIs(nfx) {
  const paths = nfx.api.paths;
  const pathTree = {
    name: 'NFXApiResource',
    isRoot: true,
    children: {}
  };

  let result = {};
  for (let p in paths) {
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
    for (const i in tokens) {
      const token = tokens[i];
      const name = parent.name + titlecase(token);

      // This is when the path is '/'
      // We are not sure that '/' comes first.
      if (token == '') {
        result = Object.assign({}, result, CreateAPIMethod(parent, token, methods));
        continue;
      }

      if (!parent.children[token]) {
        parent.children[token] = { name: name, isRoot: false, children: {} };
        result = Object.assign({}, result, CreateAPIResource(parent, name, token));
      }

      // When it is last token, it creates methods for the api resource
      if (i == (tokens.length - 1)) {
        result = Object.assign({}, result, CreateAPIMethod(parent.children[token], token, methods));
      }

      parent = parent.children[token];
    }
  }

  nfx.cfTemplate.Resources = Object.assign({}, nfx.cfTemplate.Resources, result);
}

function CreateAPIResource(parent, name, p) {
  const result = {};
  const resourceTemplate = fsReadFile(path.join(__dirname, 'cf-api-resource.json'));
  const methodJSON = JSON.parse(resourceTemplate.replace('$LAST_PATH', p));
  if (parent.isRoot) {
    methodJSON.Properties.ParentId = { 'Fn::GetAtt': ['NFXApi', 'RootResourceId'] };
  } else {
    methodJSON.Properties.ParentId = { Ref: parent.name };
  }

  result[name] = methodJSON;
  return result;
}

function CreateAPIMethod(res, urlPath, methods) {
  const result = {};
  const corsMethods = [];
  const methodTemplate = fsReadFile(path.join(__dirname, 'cf-api-method.json'));

  for (let m in methods) {
    const methodResourceName = res.name + m.toUpperCase();
    const method = methods[m];
    const methodJSON = JSON.parse(methodTemplate
      .replace('$METHOD', m.toUpperCase())
      .replace('$FUNCTION_NAME', method['x-nfx'].handler.replace(path.sep, ''))
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
    const corsMethodTemplate = fsReadFile(path.join(__dirname, 'cf-api-cors.json'));
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

function titlecase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
