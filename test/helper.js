'use strict';

process.env.NODE_ENV = 'test';

const chai = require('chai'),
      sinon = require('sinon'),
      sinonChai = require('sinon-chai');

global.expect = chai.expect;
global.sinon = sinon;

chai.use(sinonChai);

global.waitUntil = function(conditionFunc, timeoutMs, intervalMs) {
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

global.spyWithPromise = function(promiseFn) {
  const promise = new Promise(promiseFn);
  return sinon.spy(function() {
    return {
      promise() {
        return promise;
      }
    };
  });
};
