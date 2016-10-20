'use strict';

const cookieParser = require('cookie-parser'),
      bodyParser = require('body-parser');

exports.setup = (app) => {
  // you should not use any asynchronous calls here
  app.set('tableName', 'my-nfx-todo');
  app.locals.title = 'My Todo';
};

// global "before" middleware
exports.before = [
  cookieParser('s3cr3t_k3y'),
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true }),
  function(req, res, next) {
    res.set('Access-Control-Allow-Origin', '*');
    next();
  }
];

// global "after" middleware
exports.after = [
  function(req, res, next) {
    console.log(`${req.method} ${req.path} => ${req.statusCode}`);
    next();
  },
  function(err, req, res, next) {
    console.log(`[ERROR] ${req.method} ${req.path} => ${err.stack ? err.stack : err}`);
    res.status(500).send({ error: 'internal_server_error' });
    next();
  }
];
