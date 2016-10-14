'use strict';

const readConfig = require('./utils/readConfig');
      log = require('./utils/log'),
      AWS        = require('aws-sdk'),
      CLI        = require('./cli'),
      crypto     = require('crypto');

module.exports = class Session {
  constructor() {
    this.stackName = null;
    this.functions = null;
    this.bucketName = null;
    this.provider = null;
    this.region = null;
    this.api = null;
    this.hasher = null;
    this.compressedFunctions = {};
    this.nfxJSON = {};

    this.aws = null;

    this.stage = null;
  }

  static init() {
    const project   = readConfig('project');
    const functions = readConfig('functions');
    const api       = readConfig('api');

    const s = {
      stackName: `NFX-${functions.stack}`,
      functions: functions.functions,
      bucketName: project.profiles.default.bucket,
      provider: project.profiles.default.provider,
      region: project.profiles.default.region,
      api,
      hasher: crypto.createHash('sha256'),
      compressedFunctions : [],
      nfxJSON: {}
    };

    switch(s.provider) {
      case 'aws':
        AWS.config.region = s.region;
        s.aws = {
          s3: new AWS.S3();
          cf: new AWS.CloudFormation({ apiVersion: '2010-05-15' });
          cfTemplate: {};
        };
        break;

      default:
        log.error('Unknown provider');
        process.exit(1);
        break;
    }

    return Object.assign(new Session(), s);
  }
};
