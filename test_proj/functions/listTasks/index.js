'use strict';

const AWS = require('aws-sdk'),
      dynamodb = new AWS.DynamoDB(),
      uuid = require('node-uuid');

exports.handle = (req, res, next) => {
  const tableName = req.app.get('tableName');

  dynamodb.scan({
    "TableName": tableName,
  }, (err, data) => {
    if (err) {
      return next(err);
    }

    let json = { tasks: [] };

    if (Array.isArray(data.Items)) {
      json.tasks = data.Items.map((item) => {
        return {
          id: item.id.S,
          title: item.title.S,
          completed: item.completed.BOOL
        };
      });
    }

    res.send(json);
    next();
  });
};
