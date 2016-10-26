"use strict";

const log = require('../utils/log'),
      generateFunction = require('./generateFunction');

module.exports = function(functionName) {
  const err = generateFunction(functionName);
  if (err) {
    log.error(err);
    process.exit(1);
  }
};
