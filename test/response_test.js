'use strict';

const Response = require('../src/response'),
      App = require('../src/app');

describe('Response', function() {
  let res, app, req, doneFn;

  const reset = function() {
    app = new App();
    req = {};
    doneFn = sinon.spy();

    res = new Response({
      app,
      req,
      done: doneFn
    });
  };

  beforeEach(function() {
    reset();
  });

  describe('simple getters', function() {
    it('returns values', function() {
      expect(res.app).to.equal(app);
      expect(res.req).to.equal(req);
    });
  });

  describe('status()', function() {
    it('sets the status code', function() {
      res.status(200);
      expect(res.statusCode).to.equal(200);
      res.status(404);
      expect(res.statusCode).to.equal(404);
    });
  });

  describe('header functions', function() {
    it('can handle simple set and get operations', function() {
      res.set('content-type', 'text/html')
         .set('foo', 'bar');

      expect(res.get('content-type')).to.equal('text/html');
      expect(res.get('foo')).to.equal('bar');

      res.set('foo', 'baz');
      expect(res.get('foo')).to.equal('baz');
      expect(res.get('bar')).to.be.null;

      res.header('bar', 'lol');
      expect(res.get('bar')).to.equal('lol');

      res.setHeader('hello', 'world');
      expect(res.getHeader('hello')).to.equal('world');
    });

    it('handles field names case-insensitively', function() {
      res.set('Content-Type', 'text/plain')
         .set('fOo', 'bar');

      expect(res.get('cOntent-Type')).to.equal('text/plain');
      expect(res.get('Foo')).to.equal('bar');

      res.set('foo', 'baz');
      expect(res.get('Foo')).to.equal('baz');
      expect(res.get('foO')).to.equal('baz');
    });

    it('trims leading and trailing whitespace', function() {
      res.set('Content-Type', '    text/plain     ');
      expect(res.get('content-type')).to.equal('text/plain');
    });

    it('converts value to string if a non-string is passed as a param', function() {
      res.set('content-length', 123)
         .set('x-authenticated', true)
         .set('x-banned-at', null);

      expect(res.get('content-length')).to.equal('123');
      expect(res.get('x-authenticated')).to.equal('true');
      expect(res.get('x-banned-at')).to.equal('null');
    });

    it('can accept a list of strings for the value', function() {
      let val = [
        'token=foobar; Expires=Sun, 1-Jan-2017 00:00:00 GMT; Path=/; Domain=foo.com',
        'id=123; Expires=Sun, 1-Jan-2017 00:00:00 GMT; Path=/; Domain=foo.com; HttpOnly'
      ];

      res.set('set-cookie', val);
      expect(res.get('set-cookie')).to.deep.equal(val);

      val = [
        'hello',
        123
      ];

      res.set('x-junk', val);
      expect(res.get('x-junk')).to.deep.equal([
        'hello',
        '123'
      ]);
    });

    it('can take an object containing a key-value mapping of headers', function() {
      res.set({
        'content-type': 'application/json',
        'content-length': 123,
        'x-authenticated': false
      });

      expect(res.get('content-type')).to.equal('application/json');
      expect(res.get('content-length')).to.equal('123');
      expect(res.get('x-authenticated')).to.equal('false');
    });

    it('allows appending to existing headers', function() {
      res.set('foo', '123');

      res.append('foo', '456')
         .append('fOo', 789)
         .append('bar', 'foo')
         .append('bar', ['bar', 'baz', 123]);

      res.append({
        foo: '000',
        baz: 'lol'
      });

      expect(res.get('foo')).to.deep.equal([
        '123',
        '456',
        '789',
        '000'
      ]);

      expect(res.get('bar')).to.deep.equal([
        'foo',
        'bar',
        'baz',
        '123'
      ]);

      expect(res.get('baz')).to.equal('lol');
    });

    it('allows removal of headers', function() {
      res.set('Content-Type', 'text/plain')
         .set('foo', '123')
         .set('bar', ['hello', 'world']);

      res.removeHeader('cOntent-type')
         .removeHeader('bar');

      expect(res.get('content-type')).to.be.null;
      expect(res.get('foo')).not.to.be.null;
      expect(res.get('bar')).to.be.null;
    });

    it('has a read-only getter', function() {
      res.set('Content-Type', 'text/plain')
         .set('foo', '123')
         .set('bar', ['hello', 'world'])
         .set('age', [100, 200])
         .set('set-cookie', 'foo=123; Expires=Sun, 1-Jan-2017 00:00:00 GMT; Path=/; Domain=foo.com');

      expect(res.headers).to.deep.equal({
        'content-type': 'text/plain',
        foo: '123',
        bar: 'hello, world',
        age: '200',
        'set-cookie': ['foo=123; Expires=Sun, 1-Jan-2017 00:00:00 GMT; Path=/; Domain=foo.com']
      });
    });

    describe('type() for "content-type" header', function() {
      it('sets the header as passed if type contains slash', function() {
        res.type('audio/mpeg');
        expect(res.get('content-type')).to.equal('audio/mpeg');

        res.type('text/markdown; charset=utf-8');
        expect(res.get('content-type')).to.equal('text/markdown; charset=utf-8');
      });

      it('recognizes certain common extensions', function() {
        res.type('htm');
        expect(res.get('content-type')).to.equal('text/html; charset=utf-8');

        res.type('html');
        expect(res.get('content-type')).to.equal('text/html; charset=utf-8');

        res.type('js');
        expect(res.get('content-type')).to.equal('application/javascript; charset=utf-8');

        res.type('json');
        expect(res.get('content-type')).to.equal('application/json; charset=utf-8');

        res.type('txt');
        expect(res.get('content-type')).to.equal('text/plain; charset=utf-8');

        res.type('text');
        expect(res.get('content-type')).to.equal('text/plain; charset=utf-8');

        res.type('bin');
        expect(res.get('content-type')).to.equal('application/octet-stream');
      });

      it('ignores the preceding dot when an extension is passed', function() {
        res.type('.html');
        expect(res.get('content-type')).to.equal('text/html; charset=utf-8');

        res.type('.json');
        expect(res.get('content-type')).to.equal('application/json; charset=utf-8');
      });
    });

    describe('location() for "Location" header', function() {
      it('sets "Location" header', function() {
        res.location('/foo/bar');
        expect(res.get('location')).to.equal('/foo/bar');

        res.location('https://www.example.com/foo');
        expect(res.get('location')).to.equal('https://www.example.com/foo');

        res.location('https://www.example.com/hello%20^_^');
        expect(res.get('location')).to.equal('https://www.example.com/hello%20%5E_%5E');
      });

      context('when "back" is given as a param', function() {
        it('uses the value in the referer header, unless absent, in which case "/" is used', function() {
          res.location('back');
          expect(res.get('location')).to.equal('/');

          req.headers = {
            referer: 'https://www.example.com/hello%20^_^'
          };
          res.location('back');
          expect(res.get('location')).to.equal('https://www.example.com/hello%20%5E_%5E');
        });
      });
    });
  });

  describe('finishing the response', function() {
    describe('end()', function() {
      it('allows sending the response with no body', function() {
        res.end();
        expect(doneFn).to.have.been.calledOnce;
        expect(doneFn).to.have.been.calledWithExactly(null, {
          statusCode: 200,
          headers: {},
          body: ''
        });
      });

      it('cannot be invoked more than once', function() {
        expect(res.finished).to.be.false;

        res.end();
        expect(res.finished).to.be.true;

        expect(() => {
          res.end();
        }).to.throw(Error);

        expect(doneFn).to.have.been.calledOnce;
      });

      it('invokes done callback with currently set status code, body, and headers', function() {
        const body = JSON.stringify({ error: 'not_found' });
        res.__body = body;
        res.type('json')
           .set('x-foo', 'bar')
           .status(404)
           .end();

        expect(doneFn).to.have.been.calledOnce;
        expect(doneFn).to.have.been.calledWithExactly(null, {
          statusCode: 404,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'x-foo': 'bar'
          },
          body
        });
      });

      it('invokes done call back with an empty body when status code is 204 (no content)', function() {
        res.__body = 'hello world';
        res.status(204)
           .end();

        expect(doneFn).to.have.been.calledOnce;
        expect(doneFn).to.have.been.calledWithExactly(null, {
          statusCode: 204,
          headers: {},
          body: ''
        });
      });

      it('invokes done call back with an empty body when request method is HEAD', function() {
        res.__body = 'hello world';
        res.__req = { method: 'HEAD' };
        res.end();

        expect(doneFn).to.have.been.calledOnce;
        expect(doneFn).to.have.been.calledWithExactly(null, {
          statusCode: 200,
          headers: {},
          body: ''
        });
      });
    });

    describe('send()', function() {
      beforeEach(function() {
        sinon.stub(res, 'end');
      });

      context('when nothing is passed', function() {
        it('invokes end() without setting content type or body', function() {
          res.send();

          expect(res.get('content-type')).to.be.null;
          expect(res.body).to.equal('');
          expect(res.end).to.have.been.calledOnce;
          expect(res.end).to.have.been.calledWithExactly();
        });
      });

      context('when a string is passed', function() {
        it('invokes end() with html body', function() {
          res.send('<h1>It works!</h1>');

          expect(res.get('content-type')).to.equal('text/html; charset=utf-8');
          expect(res.body).to.equal('<h1>It works!</h1>');
          expect(res.end).to.have.been.calledOnce;
          expect(res.end).to.have.been.calledWithExactly();
        });
      });

      context('when an object is passed', function() {
        it('invokes end() with json body', function() {
          const j = { error_code: 123, error: 'unknown_error', error_message: 'something went wrong' };
          res.send(j);

          expect(res.get('content-type')).to.equal('application/json; charset=utf-8');
          expect(res.body).to.equal(JSON.stringify(j));
          expect(res.end).to.have.been.calledOnce;
          expect(res.end).to.have.been.calledWithExactly();
        });
      });

      context('when an array is passed', function() {
        it('invokes end() with json body', function() {
          const j = ['foo', 'bar'];
          res.send(j);

          expect(res.get('content-type')).to.equal('application/json; charset=utf-8');
          expect(res.body).to.equal(JSON.stringify(j));
          expect(res.end).to.have.been.calledOnce;
          expect(res.end).to.have.been.calledWithExactly();
        });
      });

      context('when a boolean is passed', function() {
        it('invokes end() with json body', function() {
          res.send(true);

          expect(res.get('content-type')).to.equal('application/json; charset=utf-8');
          expect(res.body).to.equal('true');
          expect(res.end).to.have.been.calledOnce;
          expect(res.end).to.have.been.calledWithExactly();
        });
      });

      context('when a number is passed', function() {
        it('invokes end() with json body', function() {
          res.send(123);

          expect(res.get('content-type')).to.equal('application/json; charset=utf-8');
          expect(res.body).to.equal('123');
          expect(res.end).to.have.been.calledOnce;
          expect(res.end).to.have.been.calledWithExactly();
        });
      });

      context('when a buffer is passed', function() {
        it('invokes end() with a utf-8  body', function() {
          const bin = new Buffer([207, 250, 237, 254, 7, 0, 0, 1, 3, 0]);
          res.send(bin);

          expect(res.get('content-type')).to.equal('application/octet-stream');
          expect(res.body).to.equal(bin.toString('binary'));
          expect(res.end).to.have.been.calledOnce;
          expect(res.end).to.have.been.calledWithExactly();
        });
      });
    });

    describe('json()', function() {
      beforeEach(function() {
        sinon.stub(res, 'end');
      });

      it('invokes end() with json representation of the data', function() {
        [
          { error_code: 123, error: 'unknown_error', error_message: 'something went wrong' },
          'hello world!',
          null,
          123,
          true,
          new Date()
        ].forEach((j) => {
          res.end.reset();
          res.json(j);

          expect(res.get('content-type')).to.equal('application/json; charset=utf-8');
          expect(res.body).to.equal(JSON.stringify(j));
          expect(res.end).to.have.been.calledOnce;
          expect(res.end).to.have.been.calledWithExactly();
        });
      });
    });

    describe('jsonp()', function() {
      beforeEach(function() {
        sinon.stub(res, 'end');
      });

      const testCases = [
        { error_code: 123, error: 'unknown_error', error_message: 'something went wrong' },
        'hello world!',
        null,
        123,
        true,
        new Date()
      ];

      context('when callback name is not specified in the query', function() {
        it('works just like json()', function() {
          testCases.forEach((j) => {
            res.end.reset();
            res.jsonp(j);

            expect(res.get('content-type')).to.equal('application/json; charset=utf-8');
            expect(res.body).to.equal(JSON.stringify(j));
            expect(res.end).to.have.been.calledOnce;
            expect(res.end).to.have.been.calledWithExactly();
          });
        });
      });

      context('when callback name is specified in the query', function() {
        beforeEach(function() {
          res.req.query = {
            callback: 'handle'
          };
        });

        it('wraps the json with the callback function', function() {
          testCases.forEach((j) => {
            res.end.reset();
            res.jsonp(j);

            expect(res.get('content-type')).to.equal('text/javascript; charset=utf-8');
            expect(res.body).to.equal(`/**/handle(${JSON.stringify(j)});`);
            expect(res.end).to.have.been.calledOnce;
            expect(res.end).to.have.been.calledWithExactly();
          });
        });

        it('escapes invalid characters that are valid in json, but invalid in js', function() {
          const j = { data: "hello\u2028world\u2029" };
          res.jsonp(j);

          expect(res.get('content-type')).to.equal('text/javascript; charset=utf-8');
          expect(res.body).to.equal(`/**/handle({"data":"hello\\u2028world\\u2029"});`);
          expect(res.end).to.have.been.calledOnce;
          expect(res.end).to.have.been.calledWithExactly();
        });
      });

      context('when "jsonp callback name" setting is defined', function() {
        beforeEach(function() {
          app.set('jsonp callback name', 'foo');
        });

        it('reads the callback function name by looking at the query param name defined in the setting', function() {
          res.req.query = {
            foo: 'bar'
          };

          const j = { hello: 'world' };
          res.jsonp(j);

          expect(res.get('content-type')).to.equal('text/javascript; charset=utf-8');
          expect(res.body).to.equal(`/**/bar(${JSON.stringify(j)});`);
          expect(res.end).to.have.been.calledOnce;
          expect(res.end).to.have.been.calledWithExactly();
        });
      });
    });

    describe('redirect()', function() {
      beforeEach(function() {
        sinon.stub(res, 'end');
      });

      it('sets "Location" header and sends response', function() {
        res.redirect('/foo/bar');
        expect(res.statusCode).to.equal(302);
        expect(res.get('location')).to.equal('/foo/bar');
        expect(res.end).to.have.been.calledOnce;
        expect(res.end).to.have.been.calledWithExactly();
        expect(res.body).to.equal(JSON.stringify({ location: "/foo/bar" }));

        res.end.reset();
        res.redirect(301, '/foo/bar');
        expect(res.statusCode).to.equal(301);
        expect(res.get('location')).to.equal('/foo/bar');
        expect(res.end).to.have.been.calledOnce;
        expect(res.end).to.have.been.calledWithExactly();
        expect(res.body).to.equal(JSON.stringify({ location: "/foo/bar" }));

        res.end.reset();
        res.redirect('https://www.example.com/foo');
        expect(res.statusCode).to.equal(302);
        expect(res.get('location')).to.equal('https://www.example.com/foo');
        expect(res.end).to.have.been.calledOnce;
        expect(res.end).to.have.been.calledWithExactly();
        expect(res.body).to.equal(JSON.stringify({ location: "https://www.example.com/foo" }));

        res.end.reset();
        res.redirect('https://www.example.com/hello%20^_^');
        expect(res.statusCode).to.equal(302);
        expect(res.get('location')).to.equal('https://www.example.com/hello%20%5E_%5E');
        expect(res.end).to.have.been.calledOnce;
        expect(res.end).to.have.been.calledWithExactly();
        expect(res.body).to.equal(JSON.stringify({ location: "https://www.example.com/hello%20%5E_%5E" }));
      });

      context('when "back" is given as a param', function() {
        it('uses the value in the referer header, unless absent, in which case "/" is used', function() {
          res.redirect('back');
          expect(res.statusCode).to.equal(302);
          expect(res.get('location')).to.equal('/');
          expect(res.end).to.have.been.calledOnce;
          expect(res.end).to.have.been.calledWithExactly();
          expect(res.body).to.equal(JSON.stringify({ location: "/" }));

          res.end.reset();
          req.headers = {
            referer: 'https://www.example.com/hello%20^_^'
          };
          res.redirect('back');
          expect(res.statusCode).to.equal(302);
          expect(res.get('location')).to.equal('https://www.example.com/hello%20%5E_%5E');
          expect(res.end).to.have.been.calledOnce;
          expect(res.end).to.have.been.calledWithExactly();
          expect(res.body).to.equal(JSON.stringify({ location: "https://www.example.com/hello%20%5E_%5E" }));

          res.end.reset();
          res.redirect(301, 'back');
          expect(res.statusCode).to.equal(301);
          expect(res.get('location')).to.equal('https://www.example.com/hello%20%5E_%5E');
          expect(res.end).to.have.been.calledOnce;
          expect(res.end).to.have.been.calledWithExactly();
          expect(res.body).to.equal(JSON.stringify({ location: "https://www.example.com/hello%20%5E_%5E" }));
        });
      });
    });

    describe('sendStatus()', function() {
      it('sets a given status code and sends a json representation of the status code', function() {
        res.sendStatus(200);
        expect(res.statusCode).to.equal(200);
        expect(res.get('content-type')).to.equal('application/json; charset=utf-8');
        expect(res.body).to.equal(JSON.stringify({ status: 'OK' }));

        reset();

        res.sendStatus(404);
        expect(res.statusCode).to.equal(404);
        expect(res.get('content-type')).to.equal('application/json; charset=utf-8');
        expect(res.body).to.equal(JSON.stringify({ status: 'Not Found' }));
      });
    });
  });

  describe('http.ServerResponse and express compatibility', function() {
    describe('writeHead()', function() {
      it('sets status code and headers', function() {
        res.writeHead(200, 'ignored', {
          'Content-Type': 'text/plain',
          'Foo': 'bar'
        });
        expect(res.statusCode).to.equal(200);
        expect(res.get('content-type')).to.equal('text/plain');
        expect(res.get('foo')).to.equal('bar');

        reset();

        res.writeHead(404, 'ignored', {
          'X-Bar': 'lol'
        });
        expect(res.statusCode).to.equal(404);
        expect(res.get('x-bar')).to.equal('lol');
      });
    });

    describe('write()', function() {
      it('writes to the response body', function() {
        const writeCb = sinon.spy();
        res.write('Hello world', 'utf8', writeCb);
        res.write('!!!');

        expect(res.body).to.equal('Hello world!!!');
        expect(writeCb).to.have.been.calledOnce;
        expect(writeCb).to.have.been.calledWithExactly();
      });
    });

    describe('end()', function() {
      it('writes to the response body and ends request', function() {
        const endCb = sinon.spy();
        res.write('Hello world');

        res.end('Foo bar', 'utf8', endCb);
        expect(doneFn).to.have.been.calledOnce;
        expect(doneFn).to.have.been.calledWithExactly(null, {
          statusCode: 200,
          headers: {},
          body: 'Hello worldFoo bar'
        });
        expect(endCb).to.have.been.calledOnce;
        expect(endCb).to.have.been.calledWithExactly();
      });
    });

    describe('mock properties and functions', function() {
      it('returns mock values for compatibility', function() {
        expect(res.sendDate).to.be.true;
        expect(res.statusMessage).to.be.undefined;
        expect(res.setTimeout()).to.equal(res);
        expect(res.addTrailers()).to.be.undefined;
        expect(res.writeContinue()).to.be.undefined;
      });
    });
  });
});
