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

  if (!req.body.title) {
    res.status(422).send({
      error: 'validation_failed',
      error_description: 'title must not be blank'
    });
    return next();
  }

  const task = {
    id: taskId,
    title: String(req.body.title),
    completed: !!req.body.completed
  };

  dynamodb.updateItem({
    TableName: tableName,
    Key: {
      S: taskId
    },
    AttributeUpdates: {
      title: {
        Action: 'PUT',
        Value: {
          S: task.title
        }
      },
      completed: {
        Action: 'PUT',
        Value: {
          BOOL: task.completed
        }
      }
    }
  }, (err, data) => {
    if (err) {
      return next(err);
    }

    res.send({ task });
    next();
  });
};
