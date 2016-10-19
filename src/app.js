'use strict';

/** App */
class App {
  /**
   * Do not initialize this class on your own. An instance of this class is accessible via [req.app]{@link Request#app} and [res.app]{@link Response#app}.
   * @param {Object} props
   */
  constructor(props) {
    props = props || {};

    this.__settings = {};
    this.__locals = { settings: this.__settings };

    const env = (props.stage && props.stage.NODE_ENV) || 'development';
    this.set('env', env);
    this.set('jsonp callback name', 'callback');
  }

  /**
   * Object available to all functions. You can set properties in this object in your `exports.app` function in your `app.js`. However, the object is then turned read-only and can no longer be modified.
   * @type {Object}
   * @readonly
   * @example
   * // app.js
   * exports.app = function(app) {
   *   app.locals.title = 'ZomboCom';
   *   app.locals.tagline = 'You can do anything at ZomboCom.';
   * };
   * // your function
   * exports.handle = function(req, res) {
   *   req.app.locals.title // => 'ZomboCom'
   *   req.app.locals.newProp = 'not allowed'; // Not allowed. Properties can only be set in `exports.app` function in `app.js`.
   * };
   */
  get locals() {
    return this.__locals;
  }

  /**
   * Settings for your application. You can set settings using [res.set()]{@link App#set} function in your `exports.app` function in your `app.js`. The settings object is then turned read-only and can no longer be modified.
   * @type {Object}
   * @readonly
   * @example
   * // app.js
   * exports.app = function(app) {
   *   app.set('x-powered-by', false);
   * };
   * // your function
   * exports.handle = function(req, res) {
   *   req.app.get('x-powered-by') // => false
   *   req.app.set('newProp', 'not allowed'); // Not allowed. Settings can only be set in `exports.app` function in `app.js`.
   * };
   */
  get settings() {
    return this.__settings;
  }

  freeze() {
    Object.freeze(this.__locals);
    Object.freeze(this.__settings);
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

    this.__settings[name] = value;

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
    return this.__settings[name];
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
