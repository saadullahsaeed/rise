'use strict';

module.exports = {
  get(object, keyPath) {
    const kp = keyPath.split('.');
    let o = object;

    for (let i = 0; i < kp.length; i++) {
      o = o[kp[i]];
      if (o == null) {
        return undefined;
      }
    }
    return o;
  }
};
