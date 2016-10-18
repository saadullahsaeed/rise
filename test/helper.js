'use strict';

const chai = require('chai'),
      sinon = require('sinon'),
      sinonChai = require('sinon-chai');

root.expect = chai.expect;
root.sinon = sinon;

chai.use(sinonChai);

root.waitUntil = function(conditionFunc, timeoutMs, intervalMs) {
  timeoutMs = timeoutMs || 1000;
  intervalMs = intervalMs || 1;

  return new Promise(function(resolve, reject) {
    const startTime = Date.now();

    const timer = setInterval(function() {
      if (conditionFunc()) {
        clearInterval(timer);
        resolve();
        return;
      }
      if ((Date.now() - startTime) > timeoutMs) {
        clearInterval(timer);
        reject(new Error('waitUntil timed out'));
      }
    }, intervalMs);
  });
};

root.spyWithPromise = function(promiseFn) {
  const promise = new Promise(promiseFn);
  return sinon.spy(function() {
    return {
      promise() {
        return promise;
      }
    };
  });
};

