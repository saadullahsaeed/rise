'use strict';

const qs = require('qs'),
      keypath = require('../util/keypath'),
      headers = require('../headers');

module.exports = {
  transform(input) {
    const event = input.event || {},
          hdrs = headers.toNode(event.headers || {});

    return {
      route: event.resource,
      path: event.path,
      protocol: hdrs['cloudfront-forwarded-proto'] || '',
      method: event.httpMethod,
      headers: hdrs,
      query: qs.stringify(event.queryStringParameters || ''),
      params: event.pathParameters || {},
      stage: event.stageVariables || {},
      body: event.body || '',
      ip: keypath.get(event, 'requestContext.identity.sourceIp') || '',
      meta: {
        provider: 'amazon',
        requestContext: event.requestContext || {},
        context: input.context || {}
      }
    };
  }
};
