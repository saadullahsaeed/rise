'use strict';

const path       = require('path'),
      program    = require('commander'),
      deploy     = require('./deploy'),
      rollback   = require('./rollback'),
      newProject = require('./new'),
      destroy    = require('./destroy');

class CLI {
  constructor(nfx) {
    const nfxVersion = require(path.join(__dirname, '..', 'package.json')).version;

    program
      .version(nfxVersion)
      .usage('[command]');

    program
      .command('deploy')
      .description('deploy a project')
      .action( () => {
        deploy(nfx);
      });

    program
      .command('rollback [version]')
      .description('rollback to the specified version')
      .action( (version) => {
        rollback(nfx, version);
      });

    program
      .command('destroy')
      .description('destroy a project')
      .action( () => {
        destroy(nfx);
      });

    program
      .command('new [stackName]')
      .description('setup provider credential')
      .option('-r, --region [region]', 'AWS region')
      .option('-b, --bucket-name [bucketName]', 'AWS bucket name')
      .action( (stackName, options) => {
        newProject(nfx, stackName, options);
      });

    program.parse(process.argv);

    if (program.args.length === 0) {
      program.outputHelp();
    }
  }
}

module.exports = CLI;
