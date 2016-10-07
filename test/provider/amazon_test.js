'use strict';

const amazon = require('../../src/provider/amazon');

describe('provider/amazon', function() {
  describe('transform()', function() {
    it('parses aws proxy integration meta data and returns request props', function() {
      const testCases = [
        {
          input: {
            "event": {
              "resource": "/items/{item_slug}/comments/{comment_id}",
              "path": "/items/my-item/comments/123",
              "httpMethod": "POST",
              "headers": {
                "Accept": "*/*",
                "CloudFront-Forwarded-Proto": "https",
                "CloudFront-Is-Desktop-Viewer": "true",
                "CloudFront-Is-Mobile-Viewer": "false",
                "CloudFront-Is-SmartTV-Viewer": "false",
                "CloudFront-Is-Tablet-Viewer": "false",
                "CloudFront-Viewer-Country": "US",
                "Content-Type": "application/x-www-form-urlencoded",
                "Host": "abcdefg123.execute-api.us-west-2.amazonaws.com",
                "User-Agent": "curl/7.43.0",
                "Via": "1.1 abcde12345af1baf7bc4ac80f77b6fbe.cloudfront.net (CloudFront)",
                "X-Amz-Cf-Id": "abcde12345vjsfKLxCv6qeGhLAksnvK3L94k-B1uzMakdFsdkaRFrA==",
                "X-fOo": "bar",
                "X-Forwarded-For": "123.4.56.123, 216.137.42.40",
                "X-Forwarded-Port": "443",
                "X-Forwarded-Proto": "https"
              },
              "queryStringParameters": {
                "arr[0]": "hello",
                "arr[1]": "world",
                "bar": "lolz",
                "foo": "123",
                "hash[alpha]": "cafe",
                "hash[beta]": "tuna fish"
              },
              "pathParameters": {
                "comment_id": "123",
                "item_slug": "my-item"
              },
              "stageVariables": {
                "awesomeId": "123",
                "FOO_BAR": "bazqux"
              },
              "requestContext": {
                "accountId": "123456789000",
                "resourceId": "abcd12",
                "stage": "prod",
                "requestId": "abcdef12-7523-22e6-97df-6fab8480ac1d",
                "identity": {
                  "cognitoIdentityPoolId": null,
                  "accountId": null,
                  "cognitoIdentityId": null,
                  "caller": null,
                  "apiKey": null,
                  "sourceIp": "123.4.56.123",
                  "cognitoAuthenticationType": null,
                  "cognitoAuthenticationProvider": null,
                  "userArn": null,
                  "userAgent": "curl/7.43.0",
                  "user": null
                },
                "resourcePath": "/items/{item_slug}/comments/{comment_id}",
                "httpMethod": "POST",
                "apiId": "abcdefg123"
              },
              "body": "hello=world&foo=123"
            },
            "context": {
              "callbackWaitsForEmptyEventLoop": true,
              "logGroupName": "/aws/lambda/TestFn",
              "logStreamName": "2016/09/29/[$LATEST]aaaaaaaa93ab4c2b842749fa38e83b0c",
              "functionName": "TestFn",
              "memoryLimitInMB": "128",
              "functionVersion": "$LATEST",
              "invokeid": "abcdef12-2853-f1e3-b42d-2659ef827ab9",
              "awsRequestId": "abcdef12-8283-1fe3-b28d-719fb3e8565e",
              "invokedFunctionArn": "arn:aws:lambda:us-west-2:123456789000:function:TestFn"
            }
          },
          output: {
            route: "/items/{item_slug}/comments/{comment_id}",
            path: "/items/my-item/comments/123",
            protocol: "https",
            method: "POST",
            httpVersion: "1.1",
            headers: {
              "accept": "*/*",
              "cloudfront-forwarded-proto": "https",
              "cloudfront-is-desktop-viewer": "true",
              "cloudfront-is-mobile-viewer": "false",
              "cloudfront-is-smarttv-viewer": "false",
              "cloudfront-is-tablet-viewer": "false",
              "cloudfront-viewer-country": "US",
              "content-type": "application/x-www-form-urlencoded",
              "host": "abcdefg123.execute-api.us-west-2.amazonaws.com",
              "user-agent": "curl/7.43.0",
              "via": "1.1 abcde12345af1baf7bc4ac80f77b6fbe.cloudfront.net (CloudFront)",
              "x-amz-cf-id": "abcde12345vjsfKLxCv6qeGhLAksnvK3L94k-B1uzMakdFsdkaRFrA==",
              "x-foo": "bar",
              "x-forwarded-for": "123.4.56.123, 216.137.42.40",
              "x-forwarded-port": "443",
              "x-forwarded-proto": "https"
            },
            query: encodeURI("arr[0]=hello&arr[1]=world&bar=lolz&foo=123&hash[alpha]=cafe&hash[beta]=tuna fish"),
            params: {
              "comment_id": "123",
              "item_slug": "my-item"
            },
            stage: {
              "awesomeId": "123",
              "FOO_BAR": "bazqux"
            },
            body: "hello=world&foo=123",
            ip: '123.4.56.123',
            meta: {
              provider: 'amazon',
              requestContext: {
                "accountId": "123456789000",
                "resourceId": "abcd12",
                "stage": "prod",
                "requestId": "abcdef12-7523-22e6-97df-6fab8480ac1d",
                "identity": {
                  "cognitoIdentityPoolId": null,
                  "accountId": null,
                  "cognitoIdentityId": null,
                  "caller": null,
                  "apiKey": null,
                  "sourceIp": "123.4.56.123",
                  "cognitoAuthenticationType": null,
                  "cognitoAuthenticationProvider": null,
                  "userArn": null,
                  "userAgent": "curl/7.43.0",
                  "user": null
                },
                "resourcePath": "/items/{item_slug}/comments/{comment_id}",
                "httpMethod": "POST",
                "apiId": "abcdefg123"
              },
              context: {
                "callbackWaitsForEmptyEventLoop": true,
                "logGroupName": "/aws/lambda/TestFn",
                "logStreamName": "2016/09/29/[$LATEST]aaaaaaaa93ab4c2b842749fa38e83b0c",
                "functionName": "TestFn",
                "memoryLimitInMB": "128",
                "functionVersion": "$LATEST",
                "invokeid": "abcdef12-2853-f1e3-b42d-2659ef827ab9",
                "awsRequestId": "abcdef12-8283-1fe3-b28d-719fb3e8565e",
                "invokedFunctionArn": "arn:aws:lambda:us-west-2:123456789000:function:TestFn"
              }
            }
          }
        },
        {
          input: {
            "event": {
              "resource": "/user",
              "path": "/user",
              "httpMethod": "GET",
              "headers": {
                "Accept": "*/*",
                "CloudFront-Forwarded-Proto": "https",
                "CloudFront-Is-Desktop-Viewer": "true",
                "CloudFront-Is-Mobile-Viewer": "false",
                "CloudFront-Is-SmartTV-Viewer": "false",
                "CloudFront-Is-Tablet-Viewer": "false",
                "CloudFront-Viewer-Country": "US",
                "Host": "abcdefg123.execute-api.us-west-2.amazonaws.com",
                "User-Agent": "curl/7.43.0",
                "Via": "1.1 abcde12345af1baf7bc4ac80f77b6fbe.cloudfront.net (CloudFront)",
                "X-Amz-Cf-Id": "abcde12345vjsfKLxCv6qeGhLAksnvK3L94k-B1uzMakdFsdkaRFrA==",
                "X-Forwarded-For": "104.7.14.145, 216.137.42.43",
                "X-Forwarded-Port": "443",
                "X-Forwarded-Proto": "https"
              },
              "queryStringParameters": null,
              "pathParameters": null,
              "stageVariables": null,
              "requestContext": {
                "accountId": "123456789000",
                "resourceId": "abcd12",
                "stage": "prod",
                "requestId": "abcdef12-7523-22e6-97df-6fab8480ac1d",
                "identity": {
                  "cognitoIdentityPoolId": null,
                  "accountId": null,
                  "cognitoIdentityId": null,
                  "caller": null,
                  "apiKey": null,
                  "sourceIp": "123.4.56.123",
                  "cognitoAuthenticationType": null,
                  "cognitoAuthenticationProvider": null,
                  "userArn": null,
                  "userAgent": "curl/7.43.0",
                  "user": null
                },
                "resourcePath": "/user",
                "httpMethod": "GET",
                "apiId": "abcdefg123"
              },
              "body": null
            },
            "context": {
              "callbackWaitsForEmptyEventLoop": true,
              "logGroupName": "/aws/lambda/TestFn",
              "logStreamName": "2016/09/29/[$LATEST]aaaaaaaa93ab4c2b842749fa38e83b0c",
              "functionName": "TestFn",
              "memoryLimitInMB": "128",
              "functionVersion": "$LATEST",
              "invokeid": "abcdef12-2853-f1e3-b42d-2659ef827ab9",
              "awsRequestId": "abcdef12-8283-1fe3-b28d-719fb3e8565e",
              "invokedFunctionArn": "arn:aws:lambda:us-west-2:123456789000:function:TestFn"
            }
          },
          output: {
            route: "/user",
            path: "/user",
            protocol: "https",
            method: "GET",
            httpVersion: "1.1",
            headers: {
              "accept": "*/*",
              "cloudfront-forwarded-proto": "https",
              "cloudfront-is-desktop-viewer": "true",
              "cloudfront-is-mobile-viewer": "false",
              "cloudfront-is-smarttv-viewer": "false",
              "cloudfront-is-tablet-viewer": "false",
              "cloudfront-viewer-country": "US",
              "host": "abcdefg123.execute-api.us-west-2.amazonaws.com",
              "user-agent": "curl/7.43.0",
              "via": "1.1 abcde12345af1baf7bc4ac80f77b6fbe.cloudfront.net (CloudFront)",
              "x-amz-cf-id": "abcde12345vjsfKLxCv6qeGhLAksnvK3L94k-B1uzMakdFsdkaRFrA==",
              "x-forwarded-for": "104.7.14.145, 216.137.42.43",
              "x-forwarded-port": "443",
              "x-forwarded-proto": "https"
            },
            query: "",
            params: {},
            stage: {},
            body: "",
            ip: '123.4.56.123',
            meta: {
              provider: 'amazon',
              requestContext: {
                "accountId": "123456789000",
                "resourceId": "abcd12",
                "stage": "prod",
                "requestId": "abcdef12-7523-22e6-97df-6fab8480ac1d",
                "identity": {
                  "cognitoIdentityPoolId": null,
                  "accountId": null,
                  "cognitoIdentityId": null,
                  "caller": null,
                  "apiKey": null,
                  "sourceIp": "123.4.56.123",
                  "cognitoAuthenticationType": null,
                  "cognitoAuthenticationProvider": null,
                  "userArn": null,
                  "userAgent": "curl/7.43.0",
                  "user": null
                },
                "resourcePath": "/user",
                "httpMethod": "GET",
                "apiId": "abcdefg123"
              },
              context: {
                "callbackWaitsForEmptyEventLoop": true,
                "logGroupName": "/aws/lambda/TestFn",
                "logStreamName": "2016/09/29/[$LATEST]aaaaaaaa93ab4c2b842749fa38e83b0c",
                "functionName": "TestFn",
                "memoryLimitInMB": "128",
                "functionVersion": "$LATEST",
                "invokeid": "abcdef12-2853-f1e3-b42d-2659ef827ab9",
                "awsRequestId": "abcdef12-8283-1fe3-b28d-719fb3e8565e",
                "invokedFunctionArn": "arn:aws:lambda:us-west-2:123456789000:function:TestFn"
              }
            }
          }
        }
      ];

      testCases.forEach((testCase) => {
        expect(amazon.transform(testCase.input)).to.deep.equal(testCase.output);
      });
    });
  });
});
