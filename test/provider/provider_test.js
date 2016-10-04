'use strict';

const provider = require('../../src/provider');

describe('provider', function() {
  const provName = 'myprovider';
  let prov;

  beforeEach(function() {
    prov = {
      transform: sinon.spy()
    };
  });

  afterEach(function() {
    delete provider._providers[provName];
  });

  describe('registerProvider()', function() {
    it('registers a provider implementation', function() {
      provider.registerProvider(provName, prov);

      expect(provider._providers[provName]).to.equal(prov);
    });
  });

  describe('transform()', function() {
    it('invokes the transform function of a given provider', function() {
      const input = { event: {}, context: {} };
      provider.registerProvider(provName, prov);
      provider.transform(provName, input);
      expect(prov.transform).to.have.been.calledOnce;
      expect(prov.transform).to.have.been.calledWithExactly(input);
    });
  });
});
