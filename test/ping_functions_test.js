'use strict';

const pingFunctions = require('../src/aws/pingFunctions');

describe('pingFunctions', function() {
  let nfx,
      listFunctionsFn,
      invokeFn;

  beforeEach(function() {
    listFunctionsFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
      resolve({
        Functions: [
          { FunctionName: "foo-stack-AppIndex-123456" },
          { FunctionName: "foo-stack-AppCreate-789012" }
        ]
      });
    });

    invokeFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
      resolve({ StatusCode: 200, Payload: '{"test":"ok"}' });
    });

    nfx = {
      stackName: 'foo-stack',
      compressedFunctions:[
        { functionName: 'AppIndex' },
        { functionName: 'AppCreate' }
      ],
      aws: {
        lambda: {
          listFunctions: listFunctionsFn,
          invoke: invokeFn
        }
      }
    };
  });

  it('pings deployed functions', function(done) {
    pingFunctions(nfx)
      .then(function(nfx) {
        expect(nfx).to.not.be.null;
        expect(listFunctionsFn).to.have.been.calledOnce;
        expect(listFunctionsFn).to.have.been.calledWith({});
        expect(invokeFn).to.have.been.calledTwice;
        expect(invokeFn).to.have.been.calledWith({
          FunctionName: 'foo-stack-AppIndex-123456',
          Payload: JSON.stringify({nfxTest: 1})
        });
        expect(invokeFn).to.have.been.calledWith({
          FunctionName: 'foo-stack-AppCreate-789012',
          Payload: JSON.stringify({nfxTest: 1})
        });
        done();
      })
      .catch(done);
  });
});
