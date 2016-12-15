'use strict';

const AWS = require('aws-sdk'),
      dynamodb = new AWS.DynamoDB(),
      uuid = require('node-uuid');

exports.handle = (req, res, next) => {
  const tableName = req.app.get('tableName');

  if (!req.body.title) {
    res.status(422).send({
      error: 'validation_failed',
      error_description: 'title must not be blank'
    });
    return next();
  }

  const task = {
    id: uuid.v4(),
    title: String(req.body.title),
    completed: !!req.body.completed
  };

  dynamodb.putItem({
    TableName: tableName,
    Item: {
      id: {
        S: task.id
      },
      title: {
        S: task.title
      },
      completed: {
        BOOL: task.completed
      }
    }
  }, (err) => {
    if (err) {
      return next(err);
    }

    res.send({ task });
    next();
  });
};
