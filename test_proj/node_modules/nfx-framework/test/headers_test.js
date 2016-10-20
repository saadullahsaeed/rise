'use strict';

const headers = require('../src/headers');

describe('headers', function() {
  describe('toNode()', function() {
    it('uses lowercase field names', function() {
      expect(headers.toNode({
        "Content-Type": "application/x-www-form-urlencoded",
        "Host": "abcdefg123.execute-api.us-west-2.amazonaws.com",
        "User-Agent": "curl/7.43.0"
      })).to.deep.equal({
        "content-type": "application/x-www-form-urlencoded",
        "host": "abcdefg123.execute-api.us-west-2.amazonaws.com",
        "user-agent": "curl/7.43.0"
      });
    });

    it('removes dupes for certain headers', function() {
      expect(headers.toNode({
        'age': ['100', '200', '300'],
        'Authorization': ['Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==', 'Basic cGV0ZTpteSBuYW1lIGlzIHBldGU='],
        'Content-Length': ['123', '456'],
        'Content-Type': ['application/json', 'text/plain'],
        'etag': ['abcd1234', 'cafebabe'],
        'expires': ['Sat, 31 Dec 2016 00:00:00 GMT', 'Sun, 1 Jan 2017 00:00:00 GMT'],
        'from': ['foo@example.com', 'bar@example.com'],
        'host': ['www.foo.com', 'www.bar.com'],
        'if-modified-since': ['Sun, 2 Oct 2016 00:00:00 GMT', 'Mon, 3 Oct 2016 00:00:00 GMT'],
        'if-unmodified-since': ['Sat, 1 Oct 2016 00:00:00 GMT', 'Sun, 2 Oct 2016 00:00:00 GMT'],
        'last-modified': ['Fri, 30 Sep 2016 00:00:00 GMT', 'Sat, 1 Oct 2016 00:00:00 GMT'],
        'location': ['http://www.foo.com/about', 'http://www.foo.com/contact'],
        'max-forwards': ['5', '10'],
        'proxy-authorization': ['Basic cGV0ZTpteSBuYW1lIGlzIHBldGU=', 'Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ=='],
        'referer': ['http://www.foo.com/links', 'http://www.bar.com/links'],
        'retry-after': ['60', '300'],
        'user-agent': ['Mozilla/5.0', 'MyBrowser/1.0']
      })).to.deep.equal({
        'age': '300',
        'authorization': 'Basic cGV0ZTpteSBuYW1lIGlzIHBldGU=',
        'content-length': '456',
        'content-type': 'text/plain',
        'etag': 'cafebabe',
        'expires': 'Sun, 1 Jan 2017 00:00:00 GMT',
        'from': 'bar@example.com',
        'host': 'www.bar.com',
        'if-modified-since': 'Mon, 3 Oct 2016 00:00:00 GMT',
        'if-unmodified-since': 'Sun, 2 Oct 2016 00:00:00 GMT',
        'last-modified': 'Sat, 1 Oct 2016 00:00:00 GMT',
        'location': 'http://www.foo.com/contact',
        'max-forwards': '10',
        'proxy-authorization': 'Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==',
        'referer': 'http://www.bar.com/links',
        'retry-after': '300',
        'user-agent': 'MyBrowser/1.0'
      });
    });

    it('always keeps values of certain headers as arrays', function() {
      expect(headers.toNode({
        'Set-Cookie': [
          'token=foobar; Expires=Sun, 1-Jan-2017 00:00:00 GMT; Path=/; Domain=foo.com',
          'id=123; Expires=Sun, 1-Jan-2017 00:00:00 GMT; Path=/; Domain=foo.com; HttpOnly'
        ]
      })).to.deep.equal({
        'set-cookie': [
          'token=foobar; Expires=Sun, 1-Jan-2017 00:00:00 GMT; Path=/; Domain=foo.com',
          'id=123; Expires=Sun, 1-Jan-2017 00:00:00 GMT; Path=/; Domain=foo.com; HttpOnly'
        ]
      });

      expect(headers.toNode({
        'set-cookie': 'token=foobar; Expires=Sun, 1-Jan-2017 00:00:00 GMT; Path=/; Domain=foo.com'
      })).to.deep.equal({
        'set-cookie': [
          'token=foobar; Expires=Sun, 1-Jan-2017 00:00:00 GMT; Path=/; Domain=foo.com'
        ]
      });
    });

    it('joins multiple values of other headers together with ", "', function() {
      expect(headers.toNode({
        'x-my-header': [
          'foo',
          'bar',
          'baz',
          123
        ]
      })).to.deep.equal({
        'x-my-header': 'foo, bar, baz, 123'
      });
    });
  });
});
