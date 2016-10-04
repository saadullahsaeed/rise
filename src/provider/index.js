'use strict';

const provider = {
  _providers: {},

  registerProvider(name, prov) {
    this._providers[name] = prov;
  },

  transform(providerName, input) {
    input = input || {};
    const prov = this._providers[providerName];

    if (!prov) {
      throw new Error(`unknown provider: ${providerName}`);
    }

    return prov.transform(input);
  }
};

provider.registerProvider('amazon', require('./amazon'));

module.exports = provider;
