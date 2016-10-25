"use strict";

const fs = require('fs'),
      yaml = require('js-yaml'),
      os = require('os'),
      path = require('path'),
      readlineSync = require('readline-sync'),
      log = require('../utils/log'),
      fsStat = require('../utils/fs').fsStat;

const DEFAULT_PROVIDER = 'aws',
      REGIONS = ['us-east-1', 'us-west-1', 'eu-west-1', 'ap-southeast-1', 'Other'];

module.exports = function(stackName, options) {
  let region = options.region,
      bucket = options.bucketName;

  const projectPath   = path.join(stackName, 'nfx.yaml'),
        routesPath = path.join(stackName, 'routes.yaml'),
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
    const regionIndex = readlineSync.keyInSelect(REGIONS, 'Region: ');
    if (regionIndex === 4) {
      region = readlineSync.question('Region: ');
    } else if (regionIndex === -1) {
      log.error('Invalid region.');
      process.exit(1);
    } else {
      region = REGIONS[regionIndex];
    }
  }

  while(!bucket) {
    bucket = readlineSync.question('Bucket: ');
  }

  const project = {
    profiles: {
      default: {
        provider: DEFAULT_PROVIDER,
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

  const awsCredStat = fsStat(awsCredPath);
  if (!awsCredStat &&
      process.env.AWS_ACCESS_KEY_ID === undefined &&
      process.env.AWS_SECRET_ACCESS_KEY === undefined) {
    log.info('Please setup your provider credentials.');
  }
};
