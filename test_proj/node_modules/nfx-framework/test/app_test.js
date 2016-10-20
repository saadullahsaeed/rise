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

    context('when frozen', function() {
      it('no longer allows modifying settings', function() {
        app.set('foo', 123);
        expect(app.get('foo')).to.equal(123);

        app.set('foo', 'hello');
        expect(app.get('foo')).to.equal('hello');

        app.freeze();
        expect(() => {
          app.set('foo', 123);
        }).to.throw(TypeError);
        expect(app.get('foo')).to.equal('hello'); // shouldn't have been changed
      });
    });
  });

  describe('locals', function() {
    it('allows setting and getting of properties in locals object', function() {
      expect(app.locals.foo).to.be.undefined;

      app.locals.foo = 12345;
      app.locals.bar = 'lol';
      expect(app.locals.foo).to.equal(12345);
      expect(app.locals.bar).to.equal('lol');

      app.locals.foo = 'hello';
      expect(app.locals.foo).to.equal('hello');
    });

    context('when frozen', function() {
      it('no longer allows modifying locals', function() {
        app.locals.foo = 12345;
        expect(app.locals.foo).to.equal(12345);

        app.locals.foo = 'hello';
        expect(app.locals.foo).to.equal('hello');

        app.freeze();
        expect(() => {
          app.locals.foo = 12345;
        }).to.throw(TypeError);
      });
    });
  });
});
