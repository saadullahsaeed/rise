'use strict';

const keypath = require('../../src/util/keypath');

describe('util/keypath', function() {
  describe('get()', function() {
    it('gets value by key path', function() {
      const testCases = [
        { obj: { foo: 123 }, keyPath: 'foo', expected: 123 },
        { obj: { foo: 123 }, keyPath: 'bar', expected: undefined },
        { obj: { foo: { bar: 'baz', qux: 777 } }, keyPath: 'foo', expected: { bar: 'baz', qux: 777 } },
        { obj: { foo: { bar: 'baz', qux: 777 } }, keyPath: 'foo.bar', expected: 'baz' },
        { obj: { foo: { bar: 'baz', qux: 777 } }, keyPath: 'foo.qux', expected: 777 },
        { obj: { foo: { bar: 'baz', qux: 777 } }, keyPath: 'bar.bar', expected: undefined },
        { obj: { foo: [123, 456] } , keyPath: 'foo', expected: [123, 456] },
        { obj: { foo: [123, 456] } , keyPath: 'foo.0', expected: 123 },
        { obj: { foo: [123, 456] } , keyPath: 'foo.1', expected: 456 },
        { obj: { foo: [{ bar: 'lol' }, 456] } , keyPath: 'foo.0.bar', expected: 'lol' },
        { obj: { foo: [{ bar: 'lol' }, 456] } , keyPath: 'foo.1.bar', expected: undefined }
      ];

      testCases.forEach((testCase) => {
        expect(keypath.get(testCase.obj, testCase.keyPath)).to.deep.equal(testCase.expected);
      });
    });
  });
});
