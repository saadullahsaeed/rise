'use strict';

module.exports = function functionLogs(nfx, functionPhysicalResourceName, startTime) {
  const cwl = nfx.aws.cwl,
        lgn = logGroupName(functionPhysicalResourceName);

  const params = {
    logGroupName: lgn,
    descending: true,
    orderBy: 'LastEventTime'
  };
  return cwl.describeLogStreams(params).promise()
    .then((data) => {
      const logStreamNames = data.logStreams.map((stream) => {
        return stream.logStreamName;
      });

      const params = {
        logGroupName: lgn,
        interleaved: false,
        logStreamNames,
        startTime
      };
      return getAllLogs(cwl, params, []).then((logs) => {
        return Promise.resolve(logs);
      })
      .catch((err) => {
        return Promise.reject(err);
      });
    })
  .catch((err) => {
    return Promise.reject(err);
  });
};

function logGroupName(functionName) {
  return `/aws/lambda/${functionName}`;
}

function getAllLogs(cwl, params, allLogs) {
  return cwl.filterLogEvents(params).promise()
    .then((data) => {
      const logs = data.events.map((e) => {
        return { timestamp: e.timestamp, message: e.message };
      });

      allLogs = allLogs.concat(logs);
      if (data.nextToken) {
        params.nextToken = data.nextToken;
        return getAllLogs(cwl, params, allLogs);
      }

      return Promise.resolve(allLogs);
    })
    .catch((err) => {
      return Promise.reject(err);
    });

}
