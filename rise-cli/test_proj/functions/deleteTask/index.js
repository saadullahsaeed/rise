'use strict';

const AWS = require('aws-sdk'),
      dynamodb = new AWS.DynamoDB(),
      uuid = require('node-uuid');

exports.handle = (req, res, next) => {
  const tableName = req.app.get('tableName'),
        taskId = req.params.taskId;

  if (!taskId) {
    res.status(404).send({
      error: 'not_found'
    });
    return next();
  }

  dynamodb.deleteItem({
    "TableName": tableName,
    "Key": {
      "id": {
        "S": taskId
      }
    }
  }, (err, data) => {
    if (err) {
      // check whether item not being found causes error
      return next(err);
    }

    res.status(204).send();
    next();
  });
};
