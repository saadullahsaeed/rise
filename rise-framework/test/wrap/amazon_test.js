'use strict';

const wrap = require('../../src/wrap/amazon'),
      Request = require('../../src/request'),
      Response = require('../../src/response'),
      App = require('../../src/app');

describe('wrap/amazon', function() {
  let functionModule, appModule;

  beforeEach(function() {
    functionModule = {};
    appModule = {};
  });

  context('when function module does not export a handle or handler function', function() {
    it('throws an error', function() {
      expect(() => {
        wrap(functionModule, appModule);
      }).to.throw(Error);
    });
  });

  context('when function module exports a handle function', function() {
    let callbackSpy;

    beforeEach(function() {
      callbackSpy = sinon.spy();

      functionModule.handle = sinon.spy(function(req, res, next) {
        res.cookie('username', 'pete');
        res.cookie('rememberme', '1');
        res.status(201).send({ created: true });
        next();
      });
    });

    context('when app module exports a setup function', function() {
      it('initializes an App object and runs the setup function with it, then freezes the App object', function() {
        appModule.setup = sinon.spy(function(app) {}); // eslint-disable-line no-unused-vars

        wrap(functionModule, appModule);

        expect(appModule.setup).to.have.been.calledOnce;
        expect(appModule.setup).to.have.been.calledWithExactly(sinon.match.instanceOf(App));
      });
    });

    context('when there is no middleware', function() {
      it('returns a lambda function which responds to riseTest for sanity checks after deploying', function() {
        const lambdaFunc = wrap(functionModule, appModule);

        expect(lambdaFunc.length).to.equal(3); // 3 arguments
        lambdaFunc({ riseTest: 1 }, null, callbackSpy);

        expect(callbackSpy).to.have.been.calledOnce;
        expect(callbackSpy).to.have.been.calledWithExactly(null, { test: 'ok' });
      });

      it('returns a lambda function that initializes req, res object and runs middleware stack', function() {
        const lambdaFunc = wrap(functionModule, appModule);

        lambdaFunc({
          httpMethod: 'POST',
          path: '/foo/123',
          resource: '/foo/{id}',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'foo=bar',
          requestContext: { dead: 'beef' }
        }, {
          hello: 'world'
        }, callbackSpy);

        expect(functionModule.handle).to.have.been.calledOnce;
        expect(functionModule.handle).to.have.been.calledWithExactly(
          sinon.match.instanceOf(Request),
          sinon.match.instanceOf(Response),
          sinon.match.func
        );

        const req = functionModule.handle.getCall(0).args[0],
              res = functionModule.handle.getCall(0).args[1];

        expect(req.method).to.equal('POST');
        expect(req.path).to.equal('/foo/123');
        expect(req.route).to.deep.equal({ path: '/foo/{id}' });
        expect(req.headers).to.deep.equal({
          'content-type': 'application/x-www-form-urlencoded',
          'content-length': '7' // automatically added
        });
        expect(req.rawBody).to.equal('foo=bar');
        expect(req.meta).to.deep.equal({
          provider: 'amazon',
          context: { hello: 'world' },
          requestContext: { dead: 'beef' }
        });
        expect(req.app).to.be.an.instanceof(App);
        expect(req.res).to.equal(res);

        expect(res.app).to.be.an.instanceof(App);
        expect(res.req).to.equal(req);

        expect(res.app).to.equal(req.app);

        expect(callbackSpy).to.have.been.calledOnce;
        expect(callbackSpy.getCall(0).args[0]).to.be.null;
        expect(callbackSpy.getCall(0).args[1]).to.deep.equal({
          body: `{"created":true}`,
          headers: {
            "set-cookie": "username=pete; Path=/",
            "Set-cookie": "rememberme=1; Path=/", // workaround for api gateway cookie bug
            "content-type": "application/json; charset=utf-8"
          },
          statusCode: 201
        });
      });
    });

    context('with middleware (non-array) present and setup function', function() {
      beforeEach(function() {
        functionModule.before = sinon.spy(function(req, res, next) { next(); });
        functionModule.after = sinon.spy(function(req, res, next) { next(); });

        appModule.setup = sinon.spy(function(app) {}); // eslint-disable-line no-unused-vars
        appModule.before = sinon.spy(function(req, res, next) { next(); });
        appModule.after = sinon.spy(function(req, res, next) { next(); });
      });

      it('returns a lambda function that runs middleware stack', function() {
        const lambdaFunc = wrap(functionModule, appModule);

        expect(appModule.setup).to.have.been.calledOnce;

        lambdaFunc({}, {}, null); // already tested above

        expect(functionModule.handle).to.have.been.calledOnce;

        const req = functionModule.handle.getCall(0).args[0],
              app = req.app;

        expect(app).to.be.an.instanceof(App);
        expect(app).to.equal(appModule.setup.getCall(0).args[0]);
        expect(appModule.setup).not.to.have.been.calledTwice;

        expect(appModule.before).to.have.been.calledOnce;

        expect(functionModule.before).to.have.been.calledOnce;
        expect(functionModule.before).to.have.been.calledAfter(appModule.before);

        expect(functionModule.handle).to.have.been.calledOnce;
        expect(functionModule.handle).to.have.been.calledAfter(functionModule.before);

        expect(functionModule.after).to.have.been.calledOnce;
        expect(functionModule.after).to.have.been.calledAfter(functionModule.handle);

        expect(appModule.after).to.have.been.calledOnce;
        expect(appModule.after).to.have.been.calledAfter(functionModule.after);
      });
    });

    context('when handle function is called "handler" instead', function() {
      beforeEach(function() {
        functionModule.handler = functionModule.handle;
        delete functionModule.handle;
        functionModule.before = sinon.spy(function(req, res, next) { next(); });
        functionModule.after = sinon.spy(function(req, res, next) { next(); });

        appModule.setup = sinon.spy(function(app) {}); // eslint-disable-line no-unused-vars
        appModule.before = sinon.spy(function(req, res, next) { next(); });
        appModule.after = sinon.spy(function(req, res, next) { next(); });
      });

      it('still works', function() {
        const lambdaFunc = wrap(functionModule, appModule);

        expect(appModule.setup).to.have.been.calledOnce;

        lambdaFunc({}, {}, null); // already tested above

        expect(functionModule.handler).to.have.been.calledOnce;

        const req = functionModule.handler.getCall(0).args[0],
              app = req.app;

        expect(app).to.be.an.instanceof(App);
        expect(app).to.equal(appModule.setup.getCall(0).args[0]);
        expect(appModule.setup).not.to.have.been.calledTwice;

        expect(appModule.before).to.have.been.calledOnce;

        expect(functionModule.before).to.have.been.calledOnce;
        expect(functionModule.before).to.have.been.calledAfter(appModule.before);

        expect(functionModule.handler).to.have.been.calledOnce;
        expect(functionModule.handler).to.have.been.calledAfter(functionModule.before);

        expect(functionModule.after).to.have.been.calledOnce;
        expect(functionModule.after).to.have.been.calledAfter(functionModule.handler);

        expect(appModule.after).to.have.been.calledOnce;
        expect(appModule.after).to.have.been.calledAfter(functionModule.after);
      });
    });
  });
});
