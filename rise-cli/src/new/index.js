"use strict";

const fs = require('fs'),
      yaml = require('js-yaml'),
      os = require('os'),
      path = require('path'),
      readlineSync = require('readline-sync'),
      log = require('../utils/log'),
      uuid = require('uuid'),
      fsStat = require('../utils/fs').fsStat,
      validateBucketName = require('../utils/validateBucketName'),
      childProcess = require('child_process');

const defaultProvider = 'aws',
      regionsArr = ['us-east-1', 'us-east-2', 'us-west-2', 'eu-central-1', 'eu-west-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2'],
      regions = new Set(regionsArr);

const packageJsonTemplate = `{
  "name": "#{STACK_NAME}",
  "version": "0.0.1",
  "engines": {
    "node": ">=4.3"
  },
  "description": "#{STACK_NAME}, a rise app",
  "scripts": {},
  "dependencies": {
    "rise-framework": "^0.0.1",
    "body-parser": "^1.15.2",
    "cookie-parser": "^1.4.3"
  }
}`;

const appJsTemplate = `'use strict';

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

  const projectPath = path.join(process.cwd(), stackName),
        riseYamlPath = path.join(projectPath, 'rise.yaml'),
        routesYamlPath = path.join(projectPath, 'routes.yaml'),
        packageJsonPath = path.join(projectPath, 'package.json'),
        appJsPath = path.join(projectPath, 'app.js'),
        awsCredPath = path.join(os.homedir(), '.aws', 'credentials');

  const dirStat = fsStat(projectPath);
  let folderExists = false;
  if (dirStat) {
    if (!dirStat.isDirectory) {
      log.error(`A file named "${projectPath}" already exists.`);
      process.exit(1);
    }

    const projectStat = fsStat(riseYamlPath),
          routesStat = fsStat(routesYamlPath);
    if (projectStat || routesStat) {
      log.error(`A project already exists at "${projectPath}".`);
      process.exit(1);
    }

    folderExists = true;
  }

  if (region && !regions.has(region)) {
    log.error('Invalid or an unsupported region.');
    process.exit(1);
  }

  if (bucket) {
    const err = validateBucketName(bucket);
    if (err) {
      log.error(err.message);
      process.exit(1);
    }
  }

  while (!region) {
    log.info('Supported regions:', regionsArr.join(', '));
    const input = readlineSync.question('AWS region: ').trim();
    if (regions.has(input)) {
      region = input;
      break;
    }

    log.error('Invalid or an unsupported region.');
  }

  // http://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html
  while (!bucket) {
    const input = readlineSync.question('S3 bucket name: '),
          err = validateBucketName(input);

    if (err) {
      log.error(err.message);
    } else {
      bucket = input;
      break;
    }
  }

  const riseYaml = {
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

  const routesYaml = {
    'x-rise': {},
    paths: {}
  };

  if (!folderExists) {
    fs.mkdirSync(stackName, 0o755);
  }

  fs.writeFileSync(riseYamlPath, yaml.safeDump(riseYaml), 'utf8');
  fs.writeFileSync(routesYamlPath, yaml.safeDump(routesYaml), 'utf8');
  fs.writeFileSync(packageJsonPath, packageJsonTemplate.replace(/\#\{STACK_NAME\}/g, stackName), 'utf8');
  fs.writeFileSync(appJsPath, appJsTemplate.replace(/\#\{STACK_NAME\}/g, stackName), 'utf8');

  console.log('Running npm install...');
  childProcess.execSync('npm install --loglevel=error', { cwd: projectPath });

  log.info(`Project successfully created at "${projectPath}"!`);

  const awsCredStat = fsStat(awsCredPath);
  if (!awsCredStat &&
      process.env.AWS_ACCESS_KEY_ID === undefined &&
      process.env.AWS_SECRET_ACCESS_KEY === undefined) {
    log.info('Please remember to setup your AWS credentials.');
  }
};
