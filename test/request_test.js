'use strict';

const Request = require('../src/request'),
      App = require('../src/app');

describe('Request', function() {
  let req, app, res, route, path, headers, rawQuery, params, stage, rawBody, meta;

  beforeEach(function() {
    app = new App();
    res = {};

    route = '/tasks/{taskSlug}/comments/{commentId}/replies';
    path = '/tasks/my-awesome-task/comments/123/replies';
    headers = {
      'host': 'api.todoly.com',
      'user-agent': 'Mozilla/5.0',
      'accept': '*/*',
      'content-length': '22',
      'content-type': 'application/x-www-form-urlencoded',
      'referer': 'https://www.example.com/',
      'cookie': 'sessionId=d7dabffddb579d3bee20; username=pete'
    };
    rawQuery = 'this_is=just+an+example&hello=world&list[0]=apple&list[1]=banana&hash[foo]=hi&hash[bar]=bye';
    params = {
      taskSlug: 'my-awesome-task',
      commentId: '123'
    };
    stage = {
      'APP_ENV': 'production',
      'DATABASE_URL': 'postgres://user1234:pass123hdf34@ec2-123-45-67-123.compute-1.amazonaws.com:6212/db123456'
    };
    rawBody = 'reply=lol&secret=false';
    meta = {
      some: {
        meta: 'data'
      }
    };

    req = new Request({
      app,
      res,
      route,
      path,
      protocol: 'https',
      method: 'POST',
      httpVersion: '1.1',
      headers,
      rawQuery,
      params,
      stage,
      rawBody,
      ip: '100.200.123.45',
      meta
    });
  });

  describe('simple getters', function() {
    it('returns values', function() {
      expect(req.app).to.equal(app);
      expect(req.res).to.equal(res);
      expect(req.routeString).to.equal(route);
      expect(req.path).to.equal(path);
      expect(req.method).to.equal('POST');
      expect(req.httpVersion).to.equal('1.1');
      expect(req.headers).to.deep.equal(headers);
      expect(req.params).to.deep.equal(params);
      expect(req.stage).to.deep.equal(stage);
      expect(req.rawBody).to.equal(rawBody);
      expect(req.meta).to.equal(meta);
    });
  });

  describe('req.route', function() {
    it('returns the route wrapped in an object (for compatibility with express)', function() {
      expect(req.route).to.deep.equal({
        path: route
      });
    });
  });

  describe('req.httpVersion*', function() {
    it('returns http version', function() {
      req = new Request({ httpVersion: '3.1' }); // 3.1 for testing purpose
      expect(req.httpVersion).to.equal('3.1');
      expect(req.httpVersionMajor).to.equal(3);
      expect(req.httpVersionMinor).to.equal(1);
    });
  });

  describe('req.query', function() {
    it('parses and returns query string parameters', function() {
      expect(req.query).to.deep.equal({
        this_is: 'just an example',
        hello: 'world',
        list: [
          'apple',
          'banana'
        ],
        hash: {
          foo: 'hi',
          bar: 'bye'
        }
      });
    });
  });

  describe('req.protocol', function() {
    it('returns protocol used in request', function() {
      expect(req.protocol).to.equal('https');
    });

    context('when x-forwarded-proto header is present', function() {
      it('returns the value of x-forwarded-proto header', function() {
        headers['x-forwarded-proto'] = 'http';
        expect(req.protocol).to.equal('http');
      });
    });
  });

  describe('req.hostname', function() {
    it('returns the hostname in the host header', function() {
      expect(req.hostname).to.equal('api.todoly.com');
    });

    context('when the host header contains the port', function() {
      it('returns only the hostname', function() {
        headers.host = 'api.todoly.com:3000';
        expect(req.hostname).to.equal('api.todoly.com');
      });
    });

    context('when the x-forwarded-host is present', function() {
      it('returns the hostname in the x-forwarded-host header', function() {
        headers['x-forwarded-host'] = 'api.my-awesome-todo-app.com';
        expect(req.hostname).to.equal('api.my-awesome-todo-app.com');
      });
    });
  });

  describe('req.port', function() {
    context('when x-forwarded-port header is present', function() {
      it('returns the port in the header', function() {
        headers['x-forwarded-port'] = '3000';
        expect(req.port).to.equal(3000);
      });
    });

    context('when host header contains the port', function() {
      it('returns the port in the header', function() {
        headers['host'] = 'api.my-awesome-todo-app.com:8080';
        expect(req.port).to.equal(8080);
      });
    });

    context('otherwise', function() {
      it('determines the header based on protocol', function() {
        headers['x-forwarded-proto'] = 'http';
        expect(req.port).to.equal(80);
      });
    });
  });

  describe('req.url', function() {
    it('returns path with query string', function() {
      expect(req.url).to.equal(path + '?' + rawQuery);
    });
  });

  describe('req.ips', function() {
    it('returns ip addresses in x-forwarded-for header', function() {
      req.headers['x-forwarded-for'] = '123.4.56.78, 201.23.45.100, 131.231.2.51';
      expect(req.ips).to.deep.equal(['123.4.56.78', '201.23.45.100', '131.231.2.51']);
    });

    context('when x-forwareded-for header is missing', function() {
      it('returns an empty array', function() {
        expect(req.ips).to.deep.equal([]);
      });
    });
  });

  describe('req.ip', function() {
    it('returns remote ip', function() {
      expect(req.ip).to.equal('100.200.123.45');
    });

    context('when x-forwareded-for header is present', function() {
      it('returns left most ip in x-forwarded-for header', function() {
        req.headers['x-forwarded-for'] = '123.4.56.78, 201.23.45.100, 131.231.2.51';
        expect(req.ip).to.equal('123.4.56.78');
      });
    });
  });

  describe('req.secure', function() {
    it('returns true when protocol is https', function() {
      expect(req.secure).to.be.true;
      headers['x-forwarded-proto'] = 'http';
      expect(req.secure).to.be.false;
    });
  });

  describe('req.xhr', function() {
    it('returns true when x-request-with header field is "XMLHttpRequest"', function() {
      expect(req.xhr).to.be.false;
      headers['x-requested-with'] = 'XMLHttpRequest';
      expect(req.xhr).to.be.true;
      headers['x-requested-with'] = 'xmlhttprequest';
      expect(req.xhr).to.be.true;
    });
  });

  describe('req.get()', function() {
    it('returns the value of the HTTP request header', function() {
      expect(req.get('host')).to.equal('api.todoly.com');
      expect(req.get('referer')).to.equal('https://www.example.com/');
      // special case: referrer -> referer
      expect(req.get('referrer')).to.equal('https://www.example.com/');
    });
  });

  describe('http.IncomingMessage compatibility', function() {
    describe('stream.Readable compatibility', function() {
      it('can read data by a given size at a time', function(done) {
        // reply=lol&secret=false

        const dataCb = sinon.spy(),
              endCb = sinon.spy();
        req.on('data', dataCb);
        req.on('end', endCb);

        req.read(6);
        expect(dataCb).to.have.been.calledOnce;
        expect(dataCb).to.have.been.calledWith(new Buffer('reply=', 'utf8'));
        expect(endCb).not.to.have.been.called;
        dataCb.reset();

        req.read(10);
        expect(dataCb).to.have.been.calledOnce;
        expect(dataCb).to.have.been.calledWith(new Buffer('lol&secret', 'utf8'));
        expect(endCb).not.to.have.been.called;
        dataCb.reset();

        req.read(20);
        expect(dataCb).to.have.been.calledOnce;
        expect(dataCb).to.have.been.calledWith(new Buffer('=false', 'utf8'));
        expect(endCb).not.to.have.been.called;
        dataCb.reset();

        req.read(100);
        expect(dataCb).not.to.have.been.called;

        process.nextTick(() => {
          expect(endCb).to.have.been.calledOnce;
          done();
        });
      });

      it('can read a large chunk of data at once if size param is not given', function(done) {
        const dataCb = sinon.spy(),
              endCb = sinon.spy();
        req.on('data', dataCb);
        req.on('end', endCb);

        req.read(5);
        expect(dataCb).to.have.been.calledOnce;
        expect(dataCb).to.have.been.calledWith(new Buffer('reply', 'utf8'));
        expect(endCb).not.to.have.been.called;
        dataCb.reset();

        req.read(); // read the rest of the data
        expect(dataCb).to.have.been.calledOnce;
        expect(dataCb).to.have.been.calledWith(new Buffer(rawBody.slice(5), 'utf8'));

        process.nextTick(() => {
          expect(endCb).to.have.been.calledOnce;
          done();
        });
      });
    });

    describe('mock properties and functions', function() {
      it('returns mock values for compatibility', function() {
        expect(req.socket).to.be.null;
        expect(req.trailers).to.deep.equal({});
        expect(req.setTimeout()).to.equal(req);
      });
    });
  });
});
