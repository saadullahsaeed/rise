'use strict';

const Request = require('../../src/request'),
      middleware = require('../../src/middleware'),
      cookieParser = require('cookie-parser');

describe('Request: compatibility with cookie-parser', function() {
  let stack, handler, res;

  beforeEach(function() {
    handler = sinon.spy(),
    res = {};

    stack = new middleware.Stack();
    stack.push(cookieParser());
    stack.push(handler);
  });

  it('parses cookies in the request header and makes it available as req.cookies', function(done) {
    const req = new Request({
      headers: {
        cookie: 'foo=hello%20world; bar=12345'
      }
    });

    expect(req.cookies).to.be.undefined;
    stack.run(req, res);

    waitUntil(() => handler.callCount > 0).then(() => {
      expect(handler).to.have.been.calledOnce;
      expect(req.cookies).not.to.be.undefined;
      expect(req.cookies).to.deep.equal({ foo: 'hello world', bar: '12345' });
      done();
    }, done);
  });
});
