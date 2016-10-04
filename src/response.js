'use strict';

const headers = require('./headers');

/** Response */
class Response {
  constructor(req, done) {
    this.__req = req;
    this.__done = done;
    this.__statusCode = null;
    this.__finished = false;
    this.__headers = {};
    this.__body = '';
  }

  /**
   * Whether the HTTP response has already been sent
   * @type {boolean}
   * @readonly
   * @example
   * res.end();
   * res.finished // => true
   */
  get finished() {
    return this.__finished;
  }

  /**
   * HTTP response status code
   * @type {number}
   * @readonly
   * @example
   * res.status(404);
   * res.statusCode // => 404
   */
  get statusCode() {
    return this.__statusCode;
  }

  /**
   * HTTP response headers object, following [Node.js convention](https://nodejs.org/api/http.html#http_message_headers)
   * @type {Object}
   * @readonly
   * @example
   * res.set('content-type', 'text/plain')
   *    .set('set-cookie', 'foo=123; Expires=Sun, 1-Jan-2017 00:00:00 GMT; Path=/; Domain=foo.com')
   *    .set('x-foo', ['bar', 'baz']);
   * res.headers
   * // => {
   * //   'content-type': 'text/plain',
   * //   'set-cookie': ['foo=123; Expires=Sun, 1-Jan-2017 00:00:00 GMT; Path=/; Domain=foo.com'],
   * //   'x-foo': 'bar, baz'
   * // }
   */
  get headers() {
    return headers.toNode(this.__headers);
  }

  /**
   * HTTP response body
   * @type {string}
   * @readonly
   * @example
   * res.send({ foo: 'bar' });
   * res.body // => '{"foo":"bar"}'
   */
  get body() {
    return this.__body;
  }

  /**
   * Sends an HTTP response.
   * @param {(string|boolean|number|Object|Array|Buffer)} [body] - Response body
   * @returns {Response} this
   * @example
   * res.send({ some: 'json' });
   * res.send([ { foo: 1 }, { foo: 2 } ]);
   * res.send('Hello world!');
   * res.send(new Buffer('foobar'));
   * res.status(404).send({ error: 'not_found' });
   * res.status(500).send('something went wrong');
   */
  send(body) {
    switch (typeof body) {
      case 'string':
        if (!this.get('Content-Type')) {
          this.type('html');
        }
        this.__body = body;
        break;

      case 'object':
        if (body === null) { // typeof null === 'object'
          break;
        }
        if (body instanceof Buffer) {
          if (!this.get('Content-Type')) {
            this.type('bin');
          }
          this.__body = body.toString('binary');
          break;
        }
        // fall through

      case 'boolean':
      case 'number':
        if (!this.get('Content-Type')) {
          this.type('json');
        }
        this.__body = JSON.stringify(body);
        break;

      case 'undefined':
        break;

      default:
        throw new TypeError("Unsupported type for 'body'");
    }

    this.end();
    return this;
  }

  /**
   * Sends an HTTP response. Use it to quickly respond without any data. To respond with data, use [res.send()]{@link Response#send} or [res.json()]{@link Response#json} instead.
   * @returns {boolean} true if response is sent
   */
  end() {
    if(this.__finished) {
      throw new Error('Response is already ended');
    }

    const statusCode = this.__statusCode != null ? this.__statusCode : 200; // allow 0
    let body = this.__body;

    if ((this.__req && this.__req.method === 'HEAD') || this.__statusCode === 204) {
      body = '';
    }

    if (typeof this.__done !== 'function') {
      return false;
    }

    this.__done(null, {
      statusCode,
      headers: this.headers,
      body
    });
    this.__finished = true;
    return true;
  }

  /**
   * Sets the HTTP response status code.
   * @param {number} code - Status code
   * @returns {Response} this
   * @example
   * res.status(200).send({ status: 'ok' });
   */
  status(code) {
    if (typeof code !== 'number') {
      throw new TypeError("'code' must be a number");
    }
    this.__statusCode = code;
    return this;
  }

  /**
   * Sets the `Content-Type` HTTP header. Known values for the `type` parameter are `html`, `js`, `json`, and `text`. If the `type` parameter passed contains the `/` character, it sets the `Content-Type` to `type`.
   * @param {string} type - type of the response body
   * @returns {Response} this
   * @example
   * res.type('html');      // => 'text/html'
   * res.type('text/html'); // => 'text/html'
   * res.type('.html');     // => 'text/html'
   * res.type('json');      // => 'application/json'
   * res.type('png');       // => 'image/png'
   */
  type(type) {
    if (typeof type !== 'string' ||
        (typeof type === 'string' && type.length === 0)) {
      throw new TypeError("'type' must be a non-empty string");
    }

    if (!type.includes('/')) {
      if (type[0] === '.') {
        type = type.slice(1);
      }

      switch (type) {
        case 'htm':
        case 'html':
          type = 'text/html; charset=utf-8';
          break;

        case 'js':
          type = 'application/javascript; charset=utf-8';
          break;

        case 'json':
          type = 'application/json; charset=utf-8';
          break;

        case 'txt':
        case 'text':
          type = 'text/plain; charset=utf-8';
          break;

        case 'bin':
          type = 'application/octet-stream';
          break;
      }
    }

    this.set('Content-Type', type);
    return this;
  }

  /**
   * Returns the value of the HTTP response header by a given `field`. The match is not case-sensitive.
   * @param {string} field - Header field name
   * @returns {(string|string[])} value of the header
   */
  get(field) {
    if (typeof field !== 'string' ||
        (typeof field === 'string' && field.length === 0)) {
      throw new TypeError('`field` must be a non-empty string');
    }

    field = field.toLowerCase();
    const val = this.__headers[field];

    if (!Array.isArray(val)) {
      return null;
    }

    return val.length === 1 ? val[0] : val;
  }

  /**
   * Sets the HTTP response header `field` to `value`. It replaces any existing value for the given `field`. To append rather than to replace, use [res.append()]{@link Response#append}. To set multiple fields at once, pass an object.
   * @param {(string|Object)} field - Header field name or an object containing a key-value mapping of headers.
   * @param {(string|string[])} [value] - Header value or a list of values
   * @returns {Response} this
   * @example
   * res.set('Content-Type', 'text/plain');
   * res.set({
   *   'Content-Type': 'text/plain',
   *   Pragma: 'no-cache'
   * });
   * res.set('X-Foo', ['bar', 'baz']);
   */
  set(field, value) {
    if ((typeof field === 'object' && !field) ||
        (typeof field !== 'object' && typeof field !== 'string') ||
        (typeof field === 'string' && field.length === 0)) {
      throw new TypeError('`field` must be a non-empty string or an object containing a key-value mapping of headers');
    }

    if (typeof field !== 'string') {
      for (const f in field) {
        if (!field.hasOwnProperty(f)) {
          continue;
        }
        this.set(f, field[f]);
      }
      return this;
    }

    field = field.toLowerCase();

    if (Array.isArray(value)) {
      this.__headers[field] = [];
      for (const i in value) {
        this.append(field, value[i]);
      }
      return this;
    }

    this.__headers[field] = [String(value)];
    return this;
  }

  /**
   * Appends a given `value` to the HTTP response header `field`. If the header `field` is not already set, it creates the header with the given `value`.
   * @param {(string|Object)} field - Header field name or an object containing a key-value mapping of header fields.
   * @param {(string|string[])} [value] - Header value or a list of values
   * @returns {Response} this
   * @example
   * res.append('Content-Type', 'text/plain');
   * res.append({
   *   'Content-Type': 'text/plain',
   *   Pragma: 'no-cache'
   * });
   * res.append('X-Foo', ['bar', 'baz']);
   **/
  append(field, value) {
    if ((typeof field === 'object' && !field) ||
        (typeof field !== 'object' && typeof field !== 'string') ||
        (typeof field === 'string' && field.length === 0)) {
      throw new TypeError('`field` must be a non-empty string or an object containing a key-value mapping of headers');
    }

    if (typeof field !== 'string') {
      for (const f in field) {
        if (!field.hasOwnProperty(f)) {
          continue;
        }
        this.append(f, field[f]);
      }
      return this;
    }

    field = field.toLowerCase();

    if (Array.isArray(value)) {
      for (const i in value) {
        this.append(field, value[i]);
      }
      return this;
    }

    if (Array.isArray(this.__headers[field])) {
      this.__headers[field].push(String(value));
    } else {
      this.set(field, value);
    }
    return this;
  }

  /**
   * Alias of [res.set()]{@link Response#set}.
   * @param {(string|Object)} field - Header field name or an object containing a key-value mapping of headers.
   * @param {(string|string[])} [value] - Header value or a list of values
   * @returns {Response} this
   */
  header(field, value) {
    return this.set(field, value);
  }

  /**
   * Removes the HTTP response header `field`.
   * @param {string} field - Header field name
   * @returns {Response} this
   * @example
   * res.removeHeader('Content-Type');
   */
  removeHeader(field) {
    if (typeof field !== 'string' ||
        (typeof field === 'string' && field.length === 0)) {
      throw new TypeError("'field' must be a non-empty string");
    }

    field = field.toLowerCase();
    if (Array.isArray(this.__headers[field])) {
      this.__headers[field] = undefined;
    }
    return this;
  }
}

Response.prototype.header = Response.prototype.set;

module.exports = Response;
