"use strict";

const fs           = require('fs'),
      YAML         = require('js-yaml'),
      os           = require('os'),
      path         = require('path'),
      readlineSync = require('readline-sync'),
      ConsoleLog   = require('../utils/consoleLog').ConsoleLog;

const DEFAULT_PROVIDER = 'aws';

module.exports = function(stackName, options) {
  let region = options.region,
      bucket = options.bucketName;

  const projectPath   = path.join(stackName, 'project.yaml'),
        functionsPath = path.join(stackName, 'functions.yaml'),
        awsCredPath   = path.join(os.homedir(), '.aws', 'credentials');

  const dirStat = fsStat(stackName);
  let folderExists = false;
  if (dirStat) {
    if (!dirStat.isDirectory) {
      ConsoleLog('err', 'Project directory exist.');
      process.exit(1);
    }

    const projectStat   = fsStat(projectPath),
          functionsStat = fsStat(functionsPath);
    if (projectStat || functionsStat) {
      ConsoleLog('err', 'Project directory exist.');
      process.exit(1);
    }

    folderExists = true;
  }

  const regions = ['us-east-1', 'us-west-1', 'eu-west-1', 'ap-southeast-1', 'Other'];
  while(!region) {
    const regionIndex = readlineSync.keyInSelect(regions, 'Region: ');
    if (regionIndex === 4) {
      region = readlineSync.question('Region: ');
    } else if (regionIndex === -1) {
      ConsoleLog('err', 'Invalid region.');
      process.exit(1);
    } else {
      region = regions[regionIndex];
    }
  }

  while(!bucket) {
    bucket = readlineSync.question('Bucket: ');
  }

  const project = {
    profiles: {
      default: {
        provider: DEFAULT_PROVIDER,
        region: region,
        bucket: bucket
      }
    }
  };

  const functions = {
    stack: stackName
  };

  if (!folderExists) {
    fs.mkdirSync(stackName, 0o755);
  }

  fs.writeFileSync(projectPath, YAML.safeDump(project), 'utf8');
  fs.writeFileSync(functionsPath, YAML.safeDump(functions), 'utf8')

  const awsCredStat = fsStat(awsCredPath);
  if (!awsCredStat &&
      process.env.AWS_ACCESS_KEY_ID === undefined &&
      process.env.AWS_SECRET_ACCESS_KEY === undefined) {
    ConsoleLog('info', 'Please setup your provider credentials.');
  }
}

function fsStat(path) {
  try {
    return fs.statSync(path);
  } catch (err) {
    return false;
  }
}
