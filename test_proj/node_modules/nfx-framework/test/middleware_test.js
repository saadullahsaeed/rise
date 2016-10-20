'use strict';

const middleware = require('../src/middleware');

describe("middleware", function() {
  describe("Stack", function() {
    let stack, mw1, mw2, mw3, errMw, errHandler;

    const req = {},
          res = {},
          myErr = new Error('some error obj');

    beforeEach(function() {
      stack = new middleware.Stack();

      mw1 = sinon.spy(function(req, res, next) { next(); });
      mw2 = sinon.spy(function(req, res, next) { next(); });
      mw3 = sinon.spy(function(req, res, next) { next(); });
      errMw = sinon.spy(function(req, res, next) { next(myErr); });
      errHandler = sinon.spy(function(err, req, res, next) {}); // eslint-disable-line no-unused-vars
    });

    describe("push() & run()", function() {
      it("throws an error if a non-function is pushed", function() {
        expect(() => {
          stack.push("hello");
        }).to.throw(TypeError);
      });

      it('invokes middleware handlers in the order they are added', function() {
        stack.push(mw1)
             .push(mw2)
             .push(mw3);

        stack.run(req, res);

        expect(mw1).to.have.been.calledOnce;
        expect(mw1).to.have.been.calledWithExactly(req, res, sinon.match.func);
        expect(mw1).to.have.been.calledBefore(mw2);

        expect(mw2).to.have.been.calledOnce;
        expect(mw2).to.have.been.calledWithExactly(req, res, sinon.match.func);
        expect(mw2).to.have.been.calledAfter(mw1);

        expect(mw3).to.have.been.calledOnce;
        expect(mw3).to.have.been.calledWithExactly(req, res, sinon.match.func);
        expect(mw3).to.have.been.calledAfter(mw2);
      });

      it('allows middleware handlers to terminate middleware chain by not invoking next()', function() {
        mw2 = sinon.spy(function(req,res) {}); // eslint-disable-line no-unused-vars

        stack.push(mw1)
             .push(mw2)
             .push(mw3);

        stack.run(req, res);

        expect(mw1).to.have.been.calledOnce;
        expect(mw1).to.have.been.calledWithExactly(req, res, sinon.match.func);
        expect(mw1).to.have.been.calledBefore(mw2);

        expect(mw2).to.have.been.calledOnce;
        expect(mw2).to.have.been.calledWithExactly(req, res, sinon.match.func);
        expect(mw2).to.have.been.calledAfter(mw1);

        expect(mw3).not.to.have.been.called;
      });

      it('skips to the next error-handling middleware when next() is invoked with an error argument', function() {
        stack.push(errMw)
             .push(mw1)
             .push(errHandler);

        stack.run(req, res);

        expect(errMw).to.have.been.calledOnce;
        expect(errMw).to.have.been.calledWithExactly(req, res, sinon.match.func);

        expect(mw1).not.to.have.been.called;

        expect(errHandler).to.have.been.calledOnce;
        expect(errHandler).to.have.been.calledWithExactly(myErr, req, res, sinon.match.func);
        expect(errHandler).to.have.been.calledAfter(errMw);
      });

      it('also skips to the next error-handling middleware when an error is thrown synchronously', function() {
        const mw = sinon.spy(function(req, res, next) { // eslint-disable-line no-unused-vars
          throw myErr;
        });

        stack.push(mw)
             .push(mw1)
             .push(errHandler);

        stack.run(req, res);

        expect(mw).to.have.been.calledOnce;
        expect(mw).to.have.been.calledWithExactly(req, res, sinon.match.func);

        expect(mw1).not.to.have.been.called;

        expect(errHandler).to.have.been.calledOnce;
        expect(errHandler).to.have.been.calledWithExactly(myErr, req, res, sinon.match.func);
        expect(errHandler).to.have.been.calledAfter(mw);
      });

      it('allows error handler to continue to the next middleware', function() {
        errHandler = sinon.spy(function(err, req, res, next) { next(); });

        stack.push(errMw)
             .push(mw1)
             .push(errHandler)
             .push(mw2);

        stack.run(req, res);

        expect(errMw).to.have.been.calledOnce;
        expect(errMw).to.have.been.calledWithExactly(req, res, sinon.match.func);

        expect(mw1).not.to.have.been.called;

        expect(errHandler).to.have.been.calledOnce;
        expect(errHandler).to.have.been.calledWithExactly(myErr, req, res, sinon.match.func);
        expect(errHandler).to.have.been.calledAfter(errMw);

        expect(mw2).to.have.been.called;
        expect(mw2).to.have.been.calledWithExactly(req, res, sinon.match.func);
        expect(mw2).to.have.been.calledAfter(errHandler);
      });

      it('allows error handler to also pass an error', function() {
        const myErr2 = new Error('another error'),
              errHandler2 = sinon.spy(function(err, req, res, next) {}); // eslint-disable-line no-unused-vars

        errHandler = sinon.spy(function(err, req, res, next) { next(myErr2); });

        stack.push(errMw)
             .push(mw1)
             .push(errHandler)
             .push(mw2)
             .push(errHandler2);

        stack.run(req, res);

        expect(errMw).to.have.been.calledOnce;
        expect(errMw).to.have.been.calledWithExactly(req, res, sinon.match.func);

        expect(mw1).not.to.have.been.called;

        expect(errHandler).to.have.been.calledOnce;
        expect(errHandler).to.have.been.calledWithExactly(myErr, req, res, sinon.match.func);
        expect(errHandler).to.have.been.calledAfter(errMw);

        expect(mw2).not.to.have.been.called;

        expect(errHandler2).to.have.been.calledOnce;
        expect(errHandler2).to.have.been.calledWithExactly(myErr2, req, res, sinon.match.func);
        expect(errHandler2).to.have.been.calledAfter(errHandler);
      });

      context('when an error handler does not exist', function() {
        it('invokes the default error handler, skipping all other middleware', function() {
          sinon.stub(stack, '_defaultErrorHandler');

          stack.push(errMw)
               .push(mw1)
               .push(mw2);

          stack.run(req, res);

          expect(errMw).to.have.been.calledOnce;

          expect(mw1).not.to.have.been.called;
          expect(mw2).not.to.have.been.called;

          expect(stack._defaultErrorHandler).to.have.been.calledOnce;
          expect(stack._defaultErrorHandler).to.have.been.calledWithExactly(myErr, req, res);
          expect(stack._defaultErrorHandler).to.have.been.calledAfter(errMw);
        });
      });
    });

    describe('default error handler', function() {
      beforeEach(function() {
        stack._logStream = { write: sinon.spy() };
        res.status = sinon.spy(() => res);
        res.send = sinon.spy();
      });

      context('when res.finished is true', function() {
        beforeEach(function() {
          res.finished = true;
        });

        context('when the error is a string', function() {
          it('logs the error', function() {
            stack._defaultErrorHandler("error!!!", req, res);
            expect(stack._logStream.write).to.have.been.calledOnce;
            expect(stack._logStream.write).to.have.been.calledWithExactly("error!!!\n");
            expect(res.status).not.to.have.been.called;
            expect(res.send).not.to.have.been.called;
          });
        });

        context('when the error is an error object with stack trace', function() {
          it('logs the stack trace of the error', function() {
            stack._defaultErrorHandler(myErr, req, res);
            expect(stack._logStream.write).to.have.been.calledOnce;
            expect(stack._logStream.write).to.have.been.calledWithExactly(myErr.stack + "\n");
            expect(res.status).not.to.have.been.called;
            expect(res.send).not.to.have.been.called;
          });
        });
      });

      context('when res.finished is false', function() {
        beforeEach(function() {
          res.finished = false;
        });

        context('when the error is a string', function() {
          it('logs the error and sends 500 internal server error', function() {
            stack._defaultErrorHandler(myErr, req, res);
            expect(stack._logStream.write).to.have.been.calledOnce;
            expect(stack._logStream.write).to.have.been.calledWithExactly(myErr.stack + "\n");
            expect(res.status).to.have.been.calledOnce;
            expect(res.status).to.have.been.calledWithExactly(500);
            expect(res.send).to.have.been.calledOnce;
            expect(res.send).to.have.been.calledWithExactly({error: 'Internal Server Error'});
          });
        });

        context('when the error is an error object with stack trace', function() {
          it('logs the stack trace of the error and sends 500 internal server error', function() {
            stack._defaultErrorHandler("error!!!", req, res);
            expect(stack._logStream.write).to.have.been.calledOnce;
            expect(stack._logStream.write).to.have.been.calledWithExactly("error!!!\n");
            expect(res.status).to.have.been.calledOnce;
            expect(res.status).to.have.been.calledWithExactly(500);
            expect(res.send).to.have.been.calledOnce;
            expect(res.send).to.have.been.calledWithExactly({error: 'Internal Server Error'});
          });
        });
      });
    });
  });
});
