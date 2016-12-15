'use strict';

module.exports = function titlecase(str, sep) {
  if (typeof sep !== 'string' || sep.length === 0) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  } else {
    return str.split(sep).map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join('');
  }
};
