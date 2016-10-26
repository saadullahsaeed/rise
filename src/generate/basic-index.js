'use strict';

exports.handle = (req, res, next) => {
  res.send({status: 'ok'});
  next();
};
