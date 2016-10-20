'use strict';

const Readable = require('stream').Readable,
      qs = require('qs');

/** Request */
class Request extends Readable {
  /**
   * Do not initialize this class on your own. An instance of this class is provided to your handler as a parameter.
   * @param {Object} props
   */
  constructor(props) {
    super();
    props = props || {};

    this.__app = props.app;
    this.__res = props.res;
    this.__route = props.route;
    this.__path = props.path;
    this.__protocol = props.protocol;
    this.__method = props.method;
    this.__httpVersion = props.httpVersion;
    this.__headers = props.headers;
    this.__rawQuery = props.rawQuery;
    this.__params = props.params;
    this.__stage = props.stage;
    this.__rawBody = props.rawBody;
    this.__ip = props.ip;
    this.__meta = props.meta;

    this.__readIndex = 0;
    this.__query = null;
    this.__url = null;
    this.__port = null;
  }

  _read(size) {
    const bodyLength = this.__rawBody.length;
    if (this.__readIndex === bodyLength) {
      this.push(null);
      return;
    }

    if (size == null) {
      size = bodyLength - this.__readIndex;
    }

    const data = this.__rawBody.slice(this.__readIndex, this.__readIndex + size);
    this.__readIndex += data.length;

    if (!this.push(data, 'utf8')) {
      this.__readIndex = bodyLength;
      return;
    }

    if (this.__readIndex === bodyLength) {
      this.push(null);
    }
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

  get res() {
    return this.__res;
  }

  /**
   * Current route. It is wrapped in an object for compatibility reasons.
   * @type {Object}
   * @readonly
   * @example
   * req.route // => { path: "/tasks/{id}" }
   * @see {@link Request#path}
   * @see {@link Request#routeString}
   */
  get route() {
    return { path: this.__route };
  }

  /**
   * Current route.
   * @type {string}
   * @readonly
   * @example
   * req.routeString // => "/tasks/{id}"
   * @see {@link Request#path}
   */
  get routeString() {
    return this.__route;
  }

  /**
   * Current path
   * @type {string}
   * @readonly
   * @example
   * req.path  // => "/tasks/123"
   * req.routeString // => "/tasks/{id}"
   * @see {@link Request#routeString}
   */
  get path() {
    return this.__path;
  }

  /**
   * HTTP method of the request, for example, `GET`, `POST`, `PUT`, `DELETE`, and so on.
   * @type {string}
   * @readonly
   * @example
   * req.method // => "GET"
   */
  get method() {
    return this.__method;
  }

  /**
   * Version of the HTTP protocol used in the request
   * @type {string}
   * @readonly
   * @example
   * HTTP/1.1
   * req.httpVersion // => "1.1"
   */
  get httpVersion() {
    return this.__httpVersion;
  }

  /**
   * Major version of the HTTP protocol used in the request
   * @type {number}
   * @readonly
   * @example
   * // HTTP/1.0
   * req.httpVersionMajor // => 1
   */
  get httpVersionMajor() {
    return parseInt(this.__httpVersion.split('.')[0], 10);
  }

  /**
   * Minor version of the HTTP protocol used in the request
   * @type {number}
   * @readonly
   * @example
   * // HTTP/1.0
   * req.httpVersionMinor // => 0
   */
  get httpVersionMinor() {
    return parseInt(this.__httpVersion.split('.')[1], 10);
  }

  /**
   * HTTP request headers, following [Node.js convention](https://nodejs.org/api/http.html#http_message_headers)
   * @type {Object}
   * @readonly
   * @example
   * req.headers
   * // => {
   * //   'accept': 'text/html',
   * //   'accept-language': 'en-US,en;q=0.8',
   * //   'referer': 'http://example.com/'
   * // }
   */
  get headers() {
    return this.__headers;
  }

  /**
   * Object containing route parameters
   * @type {Object}
   * @readonly
   * @example
   * // Route: /tasks/{taskSlug}/comments/{commentId}
   * // GET /tasks/my-awesome-task/comments/2
   * req.params
   * // => {
   * //   'taskSlug': 'my-awesome-task',
   * //   'commentId': '2'
   * // }
   */
  get params() {
    return this.__params;
  }

  /**
   * Object containing stage variables
   * @type {Object}
   * @readonly
   * @example
   * req.stage
   * // => {
   * //   'GITHUB_USERNAME': 'petejkim',
   * //   'SECRET_TOKEN': 'Ui9to8Uv1Zm6Su9jHDqw7wSRd8WI'
   * // }
   */
  get stage() {
    return this.__stage;
  }

  /**
   * Raw, unparsed request body
   * @type {string}
   * @readonly
   * @example
   * req.rawBody // => "foo=bar&baz=qux"
   */
  get rawBody() {
    return this.__rawBody;
  }

  /**
   * Extra metadata from the FaaS provider
   * @type {Object}
   * @readonly
   * @example
   * req.meta
   * // => {
   * //   'provider': 'amazon',
   * //   'requestContext': {
   * //     'accountId': '123456789000',
   * //     'resourceId': 'abcd12',
   * //    ...
   */
  get meta() {
    return this.__meta;
  }

  /**
   * Object containing query string parameters
   * @type {Object}
   * @readonly
   * @example
   * // GET /search?q=hello+world&order=desc
   * req.query
   * // => {
   * //   'search': 'hello world'
   * //   'order': 'desc'
   * // }
   * // GET /list?item[id]=123&item[type]=open&order=desc
   * req.query
   * // => {
   * //   'item': {
   * //     'id': '123',
   * //     'type': 'open'
   * //   },
   * //   'order': 'desc'
   * // }
   */
  get query() {
    return this.__query || (this.__query = qs.parse(this.__rawQuery));
  }

  /**
   * Protocol used for the HTTP request, for example, `https` or `http`.
   * @type {string}
   * @readonly
   * @example
   * req.protocol // => "https"
   */
  get protocol() {
    return this.get('x-forwarded-proto') || this.__protocol;
  }

  /**
   * Hostname from `Host` (or `X-Forwarded-Host`, if present) HTTP header. This does not include the port.
   * @type {string}
   * @readonly
   * @example
   * Host: "example.com:3000"
   * req.hostname // => "example.com"
   */
  get hostname() {
    const host = this.get('x-forwarded-host') || this.get('host');
    return (host && host.match(/^[^:]*/)[0]) || '';
  }

  /**
   * Port from `Host` (or `X-Forwarded-Port`, if present) HTTP header. If port is missing in the header, it returns `80` or `443` depending on the protocol used.
   * @type {number}
   * @readonly
   * @example
   * req.port // => 443
   */
  get port() {
    if (this.__port) {
      return this.__port;
    }
    let portFromHost = (this.get('x-forwarded-host') || this.get('host') || '').match(/:(\d+)$/);
    portFromHost = portFromHost && portFromHost[1];
    return this.__port = parseInt(this.get('x-forwarded-port') || portFromHost || (this.protocol === 'https' ? 443 : 80), 10) || 0;
  }

  /**
   * HTTP request URL string. This does not include the protocol, hostname, and the port.
   * @type {string}
   * @readonly
   * @example
   * // GET /search?q=pete
   * req.url // => "/search?q=pete"
   * @see {@link Request#protocol}
   * @see {@link Request#hostname}
   * @see {@link Request#port}
   */
  get url() {
    return this.__url || (this.__url = this.__path + '?' + this.__rawQuery);
  }

  /**
   * List of IP addresses in the `X-Forwarded-For` request header
   * @type {Array.<string>}
   * @readonly
   * @example
   * req.ips // => ["123.4.56.78", "201.11.22.33"]
   */
  get ips() {
    const forwardedFor = this.get('x-forwarded-for') || '';
    if (forwardedFor.length === 0) {
      return [];
    }
    return forwardedFor.split(/ *, */);
  }

  /**
   * The IP address of the remote host that sent the HTTP request. If `X-Forwarded-For` request header is present, this returns the first IP address in the header.
   * @type {string}
   * @readonly
   * @example
   * req.ip // => 123.4.56.78
   */
  get ip() {
    return this.ips[0] || this.__ip;
  }

  /**
   * Whether the protocol used is `https`
   * @type {boolean}
   * @readonly
   */
  get secure() {
    return this.protocol === 'https';
  }

  /**
   * Whether the HTTP request is an AJAX request. This returns true when `X-Request-With: XMLHttpRequest` header is present.
   * @type {boolean}
   * @readonly
   */
  get xhr() {
    const requestedWith = this.get('x-requested-with');
    return !!(requestedWith && requestedWith.toLowerCase() === 'xmlhttprequest');
  }

  /**
   * Returns the value of the HTTP request header by a given `field`. The match is not case-sensitive.
   * @param {string} field - Header field name
   * @returns {string} value of the header
   */
  get(field) {
    if (typeof field !== 'string' ||
        (typeof field === 'string' && field.length === 0)) {
      throw new TypeError('`field` must be a non-empty string');
    }

    field = field.toLowerCase();

    if (field === 'referrer') {
      field = 'referer';
    }

    return this.__headers[field];
  }

  /**
   * Exists only for compatibility with http.IncomingResponse
   * @returns {null}
   * @deprecated
   * @ignore
   */
  get socket() {
    return null;
  }

  /**
   * Trailers are not supported. Exists only for compatibility with http.IncomingResponse
   * @returns {Object} empty object
   * @deprecated
   * @ignore
   */
  get trailers() {
    return {};
  }

  /**
   * Exists only for compatibility with http.IncomingResponse
   * @returns {Request} this
   * @deprecated
   * @ignore
   */
  setTimeout() {
    return this;
  }
}

module.exports = Request;
