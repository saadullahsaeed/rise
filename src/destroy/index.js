"use strict";

const log = require('../utils/log'),
      deleteStack = require('../aws/deleteStack');

module.exports = function(nfx) {
  deleteStack(nfx).catch(log.error);
};
