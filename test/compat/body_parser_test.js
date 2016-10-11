'use strict';

const Request = require('../../src/request'),
      middleware = require('../../src/middleware'),
      bodyParser = require('body-parser'),
      qs = require('qs');

describe('Request: compatibility with body-parser', function() {
  let stack, handler, res;

  beforeEach(function() {
    handler = sinon.spy(),
    res = {};

    stack = new middleware.Stack();
    stack.push(bodyParser.json());
    stack.push(bodyParser.urlencoded({ extended: true }));
    stack.push(bodyParser.text());
    stack.push(handler);
  });

  describe('json', function() {
    it('parses json in request body and makes it available as req.body', function() {
      const json = JSON.stringify({ foo: 'bar', hello: 123 });

      const req = new Request({
        headers: {
          'content-type': 'application/json',
          'content-length': json.length
        },
        rawBody: json
      });

      expect(req.body).to.be.undefined;
      stack.run(req, res);

      return waitUntil(() => handler.callCount > 0).then(() => {
        expect(handler).to.have.been.calledOnce;
        expect(req.body).not.to.be.undefined;
        expect(req.body).to.deep.equal({ foo: 'bar', hello: 123 });
      });
    });
  });

  describe('form data', function() {
    it('parses url encoded form data in request body and makes it available as req.body', function() {
      const formData = qs.stringify({ foo: 123, bar: 'hello' });

      const req = new Request({
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'content-length': formData.length
        },
        rawBody: formData
      });

      expect(req.body).to.be.undefined;
      stack.run(req, res);

      return waitUntil(() => handler.callCount > 0).then(() => {
        expect(handler).to.have.been.calledOnce;
        expect(req.body).not.to.be.undefined;
        expect(req.body).to.deep.equal({ foo: '123', bar: 'hello' });
      });
    });
  });

  describe('text', function() {
    it('parses url encoded form data in request body and makes it available as req.body', function() {
      const text = 'The quick brown fox jumps over the lazy dog';

      const req = new Request({
        headers: {
          'content-type': 'text/plain',
          'content-length': text.length
        },
        rawBody: text
      });

      expect(req.body).to.be.undefined;
      stack.run(req, res);

      return waitUntil(() => handler.callCount > 0).then(() => {
        expect(handler).to.have.been.calledOnce;
        expect(req.body).not.to.be.undefined;
        expect(req.body).to.deep.equal(text);
      });
    });
  });
});
