'use strict';

const chalk = require('chalk');

function log(type) {
  if (arguments.length < 2) {
    return;
  }
  const msgs = Array.from(arguments).slice(1);
  let log = ['[rise]'];

  switch(type) {
    case 'error':
      log.push(chalk.red('ERRO'));
      break;
    case 'warn':
      log.push(chalk.yellow('WARN'));
      break;
    case 'info':
      log.push(chalk.blue('INFO'));
      break;
    case 'debug':
      log.push(chalk.gray('DEBU'));
      break;
  }

  log = log.concat(msgs.map(function(m) {
    if (m instanceof Error) {
      return m.stack;
    }
    return m;
  }));

  log.push("\n");

  const msg = log.join(' ');

  if (process.env.NODE_ENV === 'test') {
    // Don't log in tests.
    return;
  }

  if (type === 'error') {
    process.stderr.write(msg);
  } else {
    process.stdout.write(msg);
  }
}

module.exports = {
  error(/* msg */) {
    log.apply(this, ['error'].concat(Array.from(arguments)));
  },
  warn(/* msg */) {
    log.apply(this, ['warn'].concat(Array.from(arguments)));
  },
  info(/* msg */) {
    log.apply(this, ['info'].concat(Array.from(arguments)));
  },
  debug(/* msg */) {
    log.apply(this, ['debug'].concat(Array.from(arguments)));
  }
};
