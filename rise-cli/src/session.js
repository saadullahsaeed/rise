'use strict';

const config = require('./utils/manageConfig'),
      log = require('./utils/log'),
      AWS = require('aws-sdk');

module.exports = class Session {
  constructor() {
    this.stackName = null;
    this.functions = null;
    this.bucketName = null;
    this.provider = null;
    this.region = null;
    this.routes = null;
    this.hasher = null;
    this.compressedFunctions = {};
    this.riseJSON = {};

    this.aws = null;

    this.stage = null;
  }

  static init() {
    const project = config.read('rise');
    const routes  = config.read('routes');

    const s = {
      uuid: project.uuid,
      stackName: `Rise-${project.stack}`,
      functions: project.functions,
      bucketName: project.profiles.default.bucket,
      provider: project.profiles.default.provider,
      region: project.profiles.default.region,
      routes,
      compressedFunctions : [],
      riseJSON: {}
    };

    switch(s.provider) {
      case 'aws':
        AWS.config.region = s.region;
        s.aws = {
          s3: new AWS.S3(),
          cf: new AWS.CloudFormation({ apiVersion: '2010-05-15' }),
          lambda: new AWS.Lambda({ apiVersion: '2015-03-31' }),
          cwl: new AWS.CloudWatchLogs({ apiVersion: '2014-03-28' }),
          cfTemplate: {}
        };

        // FIXME: It should be configurable.
        s.stage = 'staging';
        break;

      default:
        log.error('Unknown provider');
        process.exit(1);
        break;
    }

    return Object.assign(new Session(), s);
  }
};
