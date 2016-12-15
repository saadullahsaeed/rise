'use strict';

const noDupes = [
  'age',
  'authorization',
  'content-length',
  'content-type',
  'etag',
  'expires',
  'from',
  'host',
  'if-modified-since',
  'if-unmodified-since',
  'last-modified',
  'location',
  'max-forwards',
  'proxy-authorization',
  'referer',
  'retry-after',
  'user-agent'
];

const alwaysArray = [
  'set-cookie'
];

module.exports = {
  /**
   * Converts a key-value object of HTTP headers to a format that follows Node.js' headers convention:
   * * Key-value pairs of header names and values. Header names are lower-cased.
   * * Duplicates of `age`, `authorization`, `content-length`, `content-type`, `etag`, `expires`, `from`, `host`, `if-modified-since`, `if-unmodified-since`, `last-modified`, `location`, `max-forwards`, `proxy-authorization`, `referer`, `retry-after`, or `user-agent` are discarded.
   * * `set-cookie` is always an array. Duplicates are added to the array.
   * * For all other headers, the values are joined together with `", "`.
   * @param {Object} headers - Key-value pairs of header names, and values or arrays of values.
   * @returns {Object} Key-value pairs of header names and values, converted to Node.js format.
   */
  toNode(headers) {
    const h = {};

    for (let k in headers) {
      if (headers.hasOwnProperty(k)) {
        const v = headers[k];
        k = String(k).toLowerCase();

        if (typeof v === 'string') {
          h[k] = (alwaysArray.indexOf(k) !== -1) ? [v] : v;
        } else if (Array.isArray(v)) {
          if (noDupes.indexOf(k) !== -1) {
            h[k] = String(v[v.length - 1]);
          } else if (alwaysArray.indexOf(k) !== -1) {
            h[k] = v.map((o) => String(o));
          } else {
            h[k] = v.join(', ');
          }
        }
      }
    }

    return h;
  }
};
