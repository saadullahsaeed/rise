"use strict";

const log = require('../utils/log'),
      chalk = require('chalk'),
      getFunctionPhysicalResourceName = require('../aws/getFunctionPhysicalResourceName'),
      functionLogs = require('../aws/functionLogs');

module.exports = function(nfx, functionName, options) {
  const functionNames = Object.keys(nfx.functions);
  if (functionNames.indexOf(functionName) === -1) {
    log.error(`Function "${functionName}" doesn't exist.`);
    process.exit(1);
  }

  let functionPhysicalResourceName, lastEventTime;
  getFunctionPhysicalResourceName(nfx, functionName)
    .then((name) => {
      functionPhysicalResourceName = name;
      return functionLogs(nfx, name, options.since);
    })
    .then((logs) => {
      handleLogs(nfx, logs, functionPhysicalResourceName, options.follow, options.since);
    })
    .catch(log.error);
};

function print(logs) {
  logs.forEach((l) => {
    const date = (new Date(l.timestamp)).toISOString();
    const formattedLog = `[${date}] ${l.message}`;
    process.stdout.write(formattedLog);
  });
}

function followLog(nfx, functionPhysicalResourceName, lastEventTime) {
  setTimeout(() => {
    functionLogs(nfx, functionPhysicalResourceName, lastEventTime)
      .then((logs) => {
        handleLogs(nfx, logs, functionPhysicalResourceName, true, lastEventTime);
      })
      .catch(log.error);
  }, 3000);
}

function handleLogs(nfx, logs, functionPhysicalResourceName, follow, startTime) {
  print(logs);
  if (logs.length > 0) {
    startTime = logs[logs.length-1].timestamp + 1;
  }

  if (follow) {
    followLog(nfx, functionPhysicalResourceName, startTime);
  }
}
