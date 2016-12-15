'use strict';

const qs = require('qs'),
      keypath = require('../util/keypath'),
      headers = require('../headers');

module.exports = {
  transform(input) {
    const event = input.event || {},
          hdrs = headers.toNode(event.headers || {}),
          httpVerMatch = (hdrs['via'] || '').match(/^\d+\.\d+?/);

    return {
      route: event.resource,
      path: event.path,
      protocol: hdrs['cloudfront-forwarded-proto'] || '',
      method: event.httpMethod,
      httpVersion: httpVerMatch ? httpVerMatch[0] : '1.1',
      headers: hdrs,
      rawQuery: qs.stringify(event.queryStringParameters || ''),
      params: event.pathParameters || {},
      stage: event.stageVariables || {},
      rawBody: event.body || '',
      ip: keypath.get(event, 'requestContext.identity.sourceIp') || '',
      meta: {
        provider: 'amazon',
        requestContext: event.requestContext || {},
        context: input.context || {}
      }
    };
  }
};
