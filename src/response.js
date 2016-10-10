'use strict';

const http = require('http'),
      EventEmitter = require('events'),
      headers = require('./headers');

/** Response */
class Response extends EventEmitter {
  /**
   * Do not initialize this class on your own. An instance of this class is provided to your handler as a parameter.
   * @param {Object} props
   */
  constructor(props) {
    super();
    props = props || {};

    this.__app = props.app;
    this.__req = props.req;
    this.__done = props.done;

    this.__statusCode = null;
    this.__finished = false;
    this.__headers = {};
    this.__body = '';

    this.locals = {};
  }

  /**
   * [App]{@link App} object, used to access application-wide settings.
   * @type {App}
   * @readonly
   * @see {@link App}
   */
  get app() {
    return this.__app;
  }

  get req() {
    return this.__req;
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
   * HTTP response headers, following [Node.js convention](https://nodejs.org/api/http.html#http_message_headers)
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
   * Sends an HTTP response with a given status code and the JSON representation of the status code as the response body.
   * @param {number} statusCode - Status code
   * @returns {Response} this
   * @example
   * res.sendStatus(200); // equivalent to res.status(200).send({ status: 'OK' });
   * res.sendStatus(403); // equivalent to res.status(403).send({ status: 'Forbidden' });
   * res.sendStatus(404); // equivalent to res.status(404).send({ status: 'Not Found' });
   * res.sendStatus(500); // equivalent to res.status(404).send({ status: 'Internal Server Error' });
   */
  sendStatus(statusCode) {
    if ((typeof statusCode !== 'string' && typeof statusCode !== 'number') ||
        (typeof statusCode === 'string' && isNaN(statusCode = parseInt(statusCode, 10)))) {
      throw new TypeError("'statusCode' must be a number");
    }

    return this.status(statusCode).send({ status: http.STATUS_CODES[statusCode] || String(statusCode) });
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
   * Sends an HTTP response. This function is usually invoked without any arguments to quickly respond without any data. To respond with data, you should use [res.send()]{@link Response#send} or [res.json()]{@link Response#json} instead.
   * @param {string|Buffer} [data] - data to write
   * @param {string} [encoding] - encoding to use when `data` is a string
   * @param {function} [callback] - callback to be invoked after the response is sent
   * @returns {boolean} true if response is sent
   */
  end(data, encoding, callback) {
    if (typeof data === 'function') {
      callback = data;
      data = undefined;
    } else if (data != null) {
      if (typeof encoding === 'function') {
        callback = encoding;
        encoding = undefined;
      }
      this.write(data, encoding);
    }

    if (this.__finished) {
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
    this.emit('finish');
    if (typeof callback === 'function') {
      callback();
    }
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

    this.__headers[field] = [String(value).trim()];
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
      this.__headers[field].push(String(value).trim());
    } else {
      this.set(field, value);
    }
    return this;
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

  /**
   * Set status code and response headers. Exists only for compatibility with http.IncomingResponse. You should use [res.status()]{@link Response#status} and [res.headers()]{@link Response#headers} instead.
   * @param {number} statusCode - status code
   * @param {string} statusMessage - unused
   * @param {Object} headers - headers
   * @returns {boolean} returns true if successful
   * @ignore
   */
  writeHead(statusCode, statusMessage, headers) {
    this.status(statusCode).set(headers);
  }

  /**
   * Write data to response body. Exists only for compatibility with http.IncomingResponse. You should use [res.send()]{@link Response#send} instead.
   * @param {string|Buffer} [chunk] - data to write
   * @param {string} [encoding] - encoding to use when `data` is a string
   * @param {function} [callback] - callback to be invoked after data is written
   * @returns {boolean} true if successful
   * @ignore
   */
  write(chunk, encoding, callback) {
    if (typeof chunk !== 'string' && !(chunk instanceof Buffer)) {
      throw new TypeError("'chunk' must be a string or a Buffer");
    }
    encoding = encoding || 'utf8';
    this.__body += new Buffer(chunk, encoding).toString('utf8');

    if (typeof callback === 'function') {
      callback();
    }
    return true;
  }

  /**
   * Exists only for compatibility with http.IncomingResponse
   * @returns {boolean} true if response is sent
   * @ignore
   */
  get headersSent() {
    return this.__finished;
  }

  /**
   * Exists only for compatibility with http.IncomingResponse
   * @returns {boolean} always true
   * @ignore
   */
  get sendDate() {
    return true;
  }

  /**
   * Exists only for compatibility with http.IncomingResponse
   * @returns {undefined}
   * @ignore
   */
  get statusMessage() {}

  /**
   * Exists only for compatibility with http.IncomingResponse
   * @returns {Response} this
   * @ignore
   */
  setTimeout() {
    return this;
  }

  /**
   * Exists only for compatibility with http.IncomingResponse
   * @returns {undefined}
   * @ignore
   */
  addTrailers() {}

  /**
   * Exists only for compatibility with http.IncomingResponse
   * @returns {undefined}
   * @ignore
   */
  writeContinue() {}
}

Response.prototype.header = Response.prototype.set;
Response.prototype.setHeader = Response.prototype.set;
Response.prototype.getHeader = Response.prototype.get;

module.exports = Response;
