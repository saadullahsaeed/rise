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
    stack.push(cookieParser('s3cr3t_k3y'));
    stack.push(handler);
  });

  it('parses cookies in the request header and makes it available as req.cookies', function() {
    const req = new Request({
      headers: {
        cookie: 'foo=hello%20world; bar=12345; cafe=s%3Ababe.f7P6QjlZ0bM8ztYGEqy93CCiPpA7kSWilfvigsGW2O0; invalidSig=s%3Avalue.AbCdE12345'
      }
    });

    expect(req.cookies).to.be.undefined;
    stack.run(req, res);

    return waitUntil(() => handler.callCount > 0).then(() => {
      expect(handler).to.have.been.calledOnce;
      expect(req.cookies).not.to.be.undefined;
      expect(req.cookies).to.deep.equal({ foo: 'hello world', bar: '12345' });

      expect(req.signedCookies).not.to.be.undefined;
      expect(req.signedCookies).to.deep.equal({ cafe: 'babe', invalidSig: false });
    });
  });
});
