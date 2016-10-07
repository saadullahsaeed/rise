'use strict';

const loadConfig = require('./utils/loadConfig').loadConfig,
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
    const project   = loadConfig('project');
    const functions = loadConfig('functions');
    const api       = loadConfig('api');

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
}

module.exports = NFX;
