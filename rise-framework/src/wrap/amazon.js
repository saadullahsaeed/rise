'use strict';

const Request = require('../request'),
      Response = require('../response'),
      App = require('../app'),
      Stack = require('../middleware').Stack,
      amazonProv = require('../provider/amazon');

const arrayize = function(obj) {
  if (!obj) {
    return [];
  }
  if (Array.isArray(obj)) {
    return obj;
  }
  return [obj];
};

module.exports = function wrap(functionModule, appModule) {
  if (typeof functionModule.handle !== 'function' && typeof functionModule.handler !== 'function') {
    throw new Error('"handle" function not found');
  }

  const app = new App(),
        stack = new Stack();

  const mwFuncs = arrayize(appModule.before)
    .concat(arrayize(functionModule.before))
    .concat(functionModule.handle || functionModule.handler)
    .concat(arrayize(functionModule.after))
    .concat(arrayize(appModule.after));

  mwFuncs.forEach(function(mw) {
    stack.push(mw);
  });

  if (typeof appModule.setup === 'function') {
    appModule.setup(app);
  }

  app.freeze();

  return function lambdaFunc(event, context, callback) {
    if (event.riseTest === 1) {
      callback(null, {
        test: 'ok'
      });
      return;
    }

    const req = new Request(amazonProv.transform({
      event,
      context
    }));

    const res = new Response({
      app,
      req,
      done(err, data) {
        data.headers = amazonProv.fixHeader(data.headers);
        if (typeof callback === 'function') {
          callback(err, data);
        }
      }
    });

    req.__app = app;
    req.__res = res;

    stack.run(req, res);
  };
};
