'use strict';

exports.handle = (req, res, next) => {
  res.status(200).send(`<!DOCTYPE html>
<html lang='en'>
  <head>
    <meta charset='utf-8'>
    <title>My Todo</title>
  </head>
  <body>
    <h1>My Todo</h1>
  </body>
</html>`);
  next();
});
