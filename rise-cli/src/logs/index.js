"use strict";

const log = require('../utils/log'),
      getFunctionPhysicalResourceNames = require('../aws/getFunctionPhysicalResourceNames'),
      functionLogs = require('../aws/functionLogs');

let functionPhysicalResourceNamesMap;

module.exports = function(session, functionName, options) {
  if (functionName && Object.keys(session.functions).indexOf(functionName) === -1) {
    log.error(`Function "${functionName}" doesn't exist.`);
    process.exit(1);
  }
  let functionNames = [];
  if (typeof functionName === 'undefined') {
    const allFunctionNames = Object.keys(session.functions);
    for (let i = 0; i < allFunctionNames.length; i++) {
      if (allFunctionNames[i] === 'default') {
        continue;
      }
      functionNames.push(allFunctionNames[i]);
    }
  } else {
    functionNames = [functionName];
  }

  let functionPhysicalResourceNames;
  getFunctionPhysicalResourceNames(session, functionNames)
    .then((names) => {
      functionPhysicalResourceNamesMap = names;
      functionPhysicalResourceNames = names.map((n) => {
        return n.physicalResourceName;
      });
      return functionLogs(session, functionPhysicalResourceNames, options.since);
    })
    .then((logs) => {
      handleLogs(session, logs, functionPhysicalResourceNames, options.follow, options.since);
    })
    .catch(log.error);
};

function sortAndPrint(logs) {
  const mappedLog = [];
  logs.forEach((log) => {
    log.allLogs.forEach((l) => {
      let functionName;
      for (let i = 0; i < functionPhysicalResourceNamesMap.length; i++) {
        functionName = functionPhysicalResourceNamesMap[i].resourceName;
        if (log.logGroupName === `/aws/lambda/${functionPhysicalResourceNamesMap[i].physicalResourceName}`) {
          break;
        }
      }
      mappedLog.push({
        functionName,
        message: l.message,
        timestamp: l.timestamp
      });
    });
  });

  mappedLog.sort(sortByTimestamp);

  for (let i = 0; i < mappedLog.length; i++) {
    const l = mappedLog[i];
    const date = (new Date(l.timestamp)).toISOString();
    const formattedLog = `[${date}] [${l.functionName}] ${l.message}`;
    process.stdout.write(formattedLog);
  }

  return mappedLog;
}

function sortByTimestamp(l1, l2) {
  return l1.timestamp - l2.timestamp;
}

function followLog(session, functionPhysicalResourceNames, lastEventTime) {
  setTimeout(() => {
    functionLogs(session, functionPhysicalResourceNames, lastEventTime)
      .then((logs) => {
        handleLogs(session, logs, functionPhysicalResourceNames, true, lastEventTime);
      })
      .catch(log.error);
  }, 3000);
}

function handleLogs(session, logs, functionPhysicalResourceNames, follow, startTime) {
  const sortedLogs = sortAndPrint(logs);
  if (sortedLogs.length > 0) {
    startTime = sortedLogs[sortedLogs.length - 1].timestamp + 1;
  }

  if (follow) {
    followLog(session, functionPhysicalResourceNames, startTime);
  }
}
