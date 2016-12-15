'use strict';

module.exports = function functionLogs(session, names, startTime) {
  const cwl = session.aws.cwl,
        logGroupNames = lambdaLogGroupNames(names),
        describeLogStreamPromises = [];

  for (let i = 0; i < logGroupNames.length; ++i) {
    describeLogStreamPromises.push(
      describeLogStream(cwl, logGroupNames[i])
    );
  }

  return Promise.all(describeLogStreamPromises).then((groups) => {
    const getAllLogPromises = [];
    for (let i = 0; i < groups.length; i++) {
      const logGroupName = groups[i].logGroupName;
      const logStreamNames = groups[i].logStreamNames;
      const params = {
        logGroupName,
        interleaved: false,
        logStreamNames,
        startTime
      };
      getAllLogPromises.push(
        getAllLogs(cwl, params, [])
      );
    }

    return Promise.all(getAllLogPromises).then((logs) => {
      return Promise.resolve(logs);
    });
  });
};

function lambdaLogGroupNames(names) {
  return names.map((name) => {
    return `/aws/lambda/${name}`;
  });
}

function describeLogStream(cwl, name) {
  const params = {
    logGroupName: name,
    descending: true,
    orderBy: 'LastEventTime'
  };

  return cwl.describeLogStreams(params).promise()
    .then((data) => {
      const logStreamNames = data.logStreams.map((stream) => {
        return stream.logStreamName;
      });
      return Promise.resolve({
        logGroupName: name,
        logStreamNames
      });
    })
    .catch((err) => {
      return Promise.reject(err);
    });
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

      return Promise.resolve({
        logGroupName: params.logGroupName, allLogs
      });
    })
    .catch((err) => {
      return Promise.reject(err);
    });
}
