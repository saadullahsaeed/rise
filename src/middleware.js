'use strict';

class Stack {
  constructor() {
    this._stack = [];
    this._currIndex = 0;
  }

  _defaultErrorHandler(err) {
    if (err instanceof Error && typeof err.stack === 'string') {
      process.stderr.write(err.stack + "\n");
      return;
    }
    process.stderr.write(String(err) + "\n");
  }

  push(middleware) {
    if (typeof middleware !== 'function') {
      throw new TypeError("'middleware' must be a function");
    }
    this._stack.push(middleware);
    return this;
  }

  run(req, res, err) {
    const stack = this._stack,
          fn = stack[this._currIndex];

    if (!fn) {
      return;
    }

    const nextFn = (err) => {
      if (err != null) {
        const stack = this._stack;
        let fn;

        do {
          this._currIndex++;
          fn = stack[this._currIndex];
          if (!fn) {
            this._defaultErrorHandler(err);
            return;
          }
        } while (fn.length < 4);
      } else {
        this._currIndex++;
      }

      this.run(req, res, err);
    };

    try {
      if (fn.length < 4) {
        fn(req, res, nextFn);
      } else {
        fn(err, req, res, nextFn);
      }
    } catch (err) {
      nextFn(err);
    }
  }
}

module.exports = {
  Stack
};
