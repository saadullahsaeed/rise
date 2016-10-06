'use strict';

const fs         = require('fs'),
      path       = require('path'),
      consoleLog = require('../utils/consoleLog').consoleLog,
      yaml       = require('js-yaml'),
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports.updateAPIs2 = function(nfx) {
  return new Promise((resolve, reject) => {
    setPaths(nfx);

    const req = nfx.awsSDK.cf.updateStack({
      StackName: nfx.stackName,
      TemplateBody: JSON.stringify(nfx.cfTemplate, null, 2),
      Capabilities: ['CAPABILITY_IAM']
    });

    req.on('success', function(resp) {
      consoleLog('info', `Updating stack with api methods ...`);
      nfx.awsSDK.cf.waitFor('stackUpdateComplete',
        { StackName: nfx.stackName },
        function(err, data) {
          if (err) {
            reject(err);
            return;
          }

          consoleLog('info', `Successfully updated api methods.`);
          resolve(nfx);
        }
      );
    });

    req.on('error', function(err, data) {
      if (err.message && err.message.indexOf('No updates are to be performed') !== -1) {
        consoleLog('info', "No updates on api methods. Proceed to the next step");
        resolve(nfx);
      } else {
        reject(err);
      }
    });

    req.send();
  });
}

function setPaths(nfx) {
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

      if (!parent.children[token]) {
        parent.children[token] = { name: name, isRoot: false, children: {} };
        if (!parent.isRoot) {
          result = Object.assign({}, result, CreateAPIResource(parent, name, token));
        }
      }

      // When it is last token, it creates methods for the api resource
      if (i == (tokens.length - 1)) {
        result = Object.assign({}, result, CreateAPIMethod(parent, name, token, methods));
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

  result[name] = methodJSON
  return result;
}

function CreateAPIMethod(parent, name, urlPath, methods) {
  const result = {};
  const methodTemplate = fsReadFile(path.join(__dirname, 'cf-api-method.json'));

  for (let m in methods) {
    const methodResourceName = name + m.toUpperCase();
    const methodJSON = JSON.parse(methodTemplate
      .replace('$METHOD', m.toUpperCase())
      .replace('$FUNCTION_NAME', methods[m]['x-nfx'].handler.replace(path.sep, ''))
    );

    if (parent.isRoot) {
      methodJSON.Properties.ResourceId = {
        'Fn::GetAtt': ['NFXApi', 'RootResourceId']
      };
    } else {
      methodJSON.Properties.ResourceId = { Ref: name };
    }
    result[methodResourceName] = methodJSON;
  }

  return result;
}

function titlecase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
