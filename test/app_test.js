'use strict';

const App = require('../src/app');

describe('App', function() {
  let app;

  beforeEach(function() {
    app = new App();
  });

  describe('settings', function() {
    it('allows setting and getting of settings', function() {
      expect(app.get('some setting')).to.be.undefined;

      app.set('some setting', 12345);
      expect(app.get('some setting')).to.equal(12345);
      expect(app.set('some setting')).to.equal(12345); // set with no value === get

      app.set('sitrep', 'snafu');
      expect(app.get('sitrep')).to.equal('snafu');

      app.set('hyperdrive', true);
      expect(app.get('hyperdrive')).to.be.true;
      expect(app.enabled('hyperdrive')).to.be.true;
      expect(app.disabled('hyperdrive')).to.be.false;

      app.disable('hyperdrive');
      expect(app.get('hyperdrive')).to.be.false;
      expect(app.disabled('hyperdrive')).to.be.true;
      expect(app.enabled('hyperdrive')).to.be.false;

      app.enable('hyperdrive');
      expect(app.enabled('hyperdrive')).to.be.true;
    });
  });
});
