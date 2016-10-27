"use strict";

const fs = require('fs'),
      yaml = require('js-yaml'),
      os = require('os'),
      path = require('path'),
      readlineSync = require('readline-sync'),
      log = require('../utils/log'),
      uuid = require('uuid'),
      fsStat = require('../utils/fs').fsStat;

const defaultProvider = 'aws',
      regions = ['us-east-1', 'us-east-2', 'us-west-2', 'eu-central-1', 'eu-west-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2'],
      appJSTemplate = `
'use strict';

const cookieParser = require('cookie-parser'),
      bodyParser = require('body-parser');

exports.setup = (app) => {
  // you should not use any asynchronous calls here
  app.locals.title = '#{STACK_NAME}';
};

// global "before" middleware
exports.before = [
  cookieParser('s3cr3t_k3y'),
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true })
/* To enable CORS
  function(req, res, next) {
    res.set('Access-Control-Allow-Origin', '*');
    next();
  }
*/
];

// global "after" middleware
exports.after = [
/* To log each request
  function(req, res, next) {
    console.log(\`\${req.method} \${req.path} => \${req.statusCode}\`);
    next();
  }
*/
];`;

module.exports = function(stackName, options) {
  let region = options.region,
      bucket = options.bucketName;

  const projectPath   = path.join(stackName, 'nfx.yaml'),
        routesPath = path.join(stackName, 'routes.yaml'),
        appJSPath = path.join(stackName, 'app.js'),
        awsCredPath   = path.join(os.homedir(), '.aws', 'credentials');

  const dirStat = fsStat(stackName);
  let folderExists = false;
  if (dirStat) {
    if (!dirStat.isDirectory) {
      log.error('Project directory exist.');
      process.exit(1);
    }

    const projectStat = fsStat(projectPath),
          routesStat = fsStat(routesPath);
    if (projectStat || routesStat) {
      log.error('Project directory exist.');
      process.exit(1);
    }

    folderExists = true;
  }

  while(!region) {
    const regionIndex = readlineSync.keyInSelect(regions, 'Region: ');
    if (regionIndex === 4) {
      region = readlineSync.question('Region: ');
    } else if (regionIndex === -1) {
      log.error('Invalid region.');
      process.exit(1);
    } else {
      region = regions[regionIndex];
    }
  }

  while(!bucket) {
    bucket = readlineSync.question('Bucket: ');
  }

  const project = {
    uuid: uuid.v4(),
    profiles: {
      default: {
        provider: defaultProvider,
        region,
        bucket
      }
    },
    stack: stackName,
    functions: {}
  };

  const routes = {
    'x-nfx': {},
    paths: {}
  };

  if (!folderExists) {
    fs.mkdirSync(stackName, 0o755);
  }

  fs.writeFileSync(projectPath, yaml.safeDump(project), 'utf8');
  fs.writeFileSync(routesPath, yaml.safeDump(routes), 'utf8');
  fs.writeFileSync(appJSPath, appJSTemplate.replace(/\#\{STACK_NAME\}/, stackName), 'utf8');

  const awsCredStat = fsStat(awsCredPath);
  if (!awsCredStat &&
      process.env.AWS_ACCESS_KEY_ID === undefined &&
      process.env.AWS_SECRET_ACCESS_KEY === undefined) {
    log.info('Please setup your provider credentials.');
  }
};
