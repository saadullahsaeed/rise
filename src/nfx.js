'use strict';

const loadYAML   = require('./utils/yaml').loadYAML,
      consoleLog = require('./utils/consoleLog').consoleLog,
      AWS        = require('aws-sdk'),
      CLI        = require('./cli'),
      crypto     = require('crypto');

class NFX {
  init() {
    this.NFX = {}
    this.loadConfigs();
    new CLI(this.NFX);
  }

  loadConfigs() {
    const project   = this.loadCoreConfig('project.yaml');
    const functions = this.loadCoreConfig('functions.yaml');
    const api       = this.loadCoreConfig('api.yaml');

    this.NFX.stackName           = `NFX-${functions.stack}`;
    this.NFX.functions           = functions.functions;
    this.NFX.bucketName          = project.profiles.default.bucket;
    this.NFX.provider            = project.profiles.default.provider;
    this.NFX.region              = project.profiles.default.region;
    this.NFX.api                 = api;
    this.NFX.hasher              = crypto.createHash('sha256');
    this.NFX.compressedFunctions = [];
    this.NFX.nfxJSON             = {};

    switch(this.NFX.provider) {
      case 'aws':
        AWS.config.region = this.NFX.region;
        this.NFX.awsSDK = {};
        this.NFX.awsSDK.cf = new AWS.CloudFormation({ apiVersion: '2010-05-15' });
        this.NFX.awsSDK.s3 = new AWS.S3();

        this.NFX.cfTemplate = {};

        break;
      default:
        consoleLog('err', 'Unknown provider');
        process.exit(1);
        break;
    }
  }

  loadCoreConfig(file) {
    const config = loadYAML(file);
    if (!config) {
      consoleLog('err', `Invalid ${file}.`);
      process.exit(1);
    }

    return config;
  }

}

module.exports = NFX;
