'use strict';

/** App */
class App {
  /**
   * Do not initialize this class on your own. An instance of this class is accessible via [req.app]{@link Request#app} and [res.app]{@link Response#app}.
   * @param {Object} props
   */
  constructor(props) {
    props = props || {};

    this.settings = {};
    this.locals = { settings: this.settings };

    const env = (props.stage && props.stage.NODE_ENV) || 'development';
    this.set('env', env);
  }

  /**
   * Sets setting `name` to `value`.
   * @param {string} name - Name of the setting
   * @param {*} value - Value of the setting
   * @returns {App} this
   * @example
   * app.set('title', 'My Awesome App');
   * app.get('title'); // => 'My Awesome App'
   */
  set(name, value) {
    if (arguments.length === 1) {
      return this.get(name);
    }

    this.settings[name] = value;

    return this;
  }

  /**
   * Gets the value of the setting `name`.
   * @param {string} name - Name of the setting
   * @returns {*} Value of the setting
   * @example
   * app.set('title', 'My Awesome App');
   * app.get('title'); // => 'My Awesome App'
   */
  get(name) {
    return this.settings[name];
  }

  /**
   * Sets the value of the boolean setting `name` to `true`. This is equivalent to calling `app.set(name, true)`.
   * @param {string} name - Name of the setting
   * @returns {App} this
   * @example
   * app.enable('something');
   * app.get('something'); // => true
   */
  enable(name) {
    return this.set(name, true);
  }

  /**
   * Sets the value of the boolean setting `name` to `false`. This is equivalent to calling `app.set(name, false)`.
   * @param {string} name - Name of the setting
   * @returns {App} this
   * @example
   * app.disable('something');
   * app.get('something'); // => false
   */
  disable(name) {
    return this.set(name, false);
  }

  /**
   * Returns true if the boolean setting `name` is enabled (`true`).
   * @param {string} name - Name of the setting
   * @returns {boolean}
   * @example
   * app.enable('something');
   * app.enabled('something'); // => true
   * app.disabled('something'); // => false
   */
  enabled(name) {
    return !!this.get(name);
  }

  /**
   * Returns true if the boolean setting `name` is disabled (`false`).
   * @param {string} name - Name of the setting
   * @returns {boolean}
   * @example
   * app.disable('something');
   * app.disabled('something'); // => true
   * app.enabled('something'); // => false
   */
  disabled(name) {
    return !this.get(name);
  }
}

module.exports = App;
