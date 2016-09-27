'use strict';
const chalk = require('chalk');

module.exports.ConsoleLog = function(type, msg) {
  let log = chalk.white.bgBlack('nfx');
  switch(type) {
    case 'err':
      log = `${log} ${chalk.red.bgBlack('ERR!')} ${msg}`;
      break;
    case 'warn':
      log = `${log} ${chalk.yellow.bgBlack('WARN')} ${msg}`;
      break;
    case 'note':
      log = `${log} ${chalk.magenta.bgBlack('NOTE')} ${msg}`;
      break;
    default:
      log = `${log} ${msg}`;
      break;
  }
  console.log(log);
}
