'use strict';

module.exports = function pingFunctions(nfx) {
  const lambda = nfx.aws.lambda,
        stackName = nfx.stackName;

  nfx.state = 'PINGING';
  return lambda.listFunctions({}).promise()
    .then(function(data) {
      return pingPromiseAll(lambda, stackName, nfx.compressedFunctions, data.Functions).
        then(function() {
          nfx.state = 'PINGED';
          return Promise.resolve(nfx);
        });
    });
};

function pingPromiseAll(lambda, stackName, uploadedFunctions, functions) {
  const pingPromises = [];

  for (let i = 0; i < functions.length; ++i) {
    const f = functions[i].FunctionName;

    for (let i = 0; i < uploadedFunctions.length; ++i) {
      const funcPrefix = `${stackName}-${uploadedFunctions[i].functionName}`;

      if (f.startsWith(funcPrefix)) {
        pingPromises.push(pingPromise(lambda, f));
      }
    }
  }

  return Promise.all(pingPromises);
}

function pingPromise(lambda, functionName) {
  return lambda.invoke({
    FunctionName: functionName,
    Payload: JSON.stringify({nfxTest: 1})
  }).promise()
    .then(function(data) {
      if (data.StatusCode !== 200 || data.Payload !== '{"test":"ok"}') {
        return Promise.reject(new Error("functions are not deployed properly"));
      }
    });
}
