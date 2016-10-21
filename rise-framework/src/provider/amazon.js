'use strict';

const qs = require('qs'),
      keypath = require('../util/keypath'),
      headers = require('../headers');

module.exports = {
  transform(input) {
    const event = input.event || {},
          hdrs = headers.toNode(event.headers || {}),
          httpVerMatch = (hdrs['via'] || '').match(/^\d+\.\d+?/);

    if (!hdrs['content-length'] && typeof event.body === 'string') {
      hdrs['content-length'] = String(event.body.length);
    }

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
  },

  fixHeader(headers) {
    const hdrs = {};

    for (const key in headers) {
      const val = headers[key];
      if (Array.isArray(val)) {
        let j = 0;

        const maxJ = Math.pow(2, key.length);

        for (let i = 0; i < val.length; i++) {
          for (; j < maxJ; j++) {
            const bm = [];

            for (let k = j; k > 0; k = Math.floor(k / 2)) {
              bm.push(k % 2 === 1);
            }

            let newKey = bm.map((b, i) => b ? key.charAt(i).toUpperCase() : key.charAt(i)).join('');
            newKey = newKey + key.substr(newKey.length, key.length - newKey.length);

            if (!(newKey in hdrs)) {
              hdrs[newKey] = val[i];
              break;
            }
          }
        }
      } else {
        hdrs[key] = val;
      }
    }

    return hdrs;
  }
};
