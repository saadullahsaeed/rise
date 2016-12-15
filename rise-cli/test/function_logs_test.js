'use strict';

const functionLogs = require('../src/aws/functionLogs');

describe('functionLogs', function() {
  let session,
      functionPhysicalResourceName,
      describeLogStreamsFn,
      filterLogEventsFn;

  beforeEach(function() {
    functionPhysicalResourceName = 'resourceName';
    describeLogStreamsFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
      resolve({
        logStreams: [
          { logStreamName: 'stream 1' },
          { logStreamName: 'stream 2' },
          { logStreamName: 'stream 3' }
        ]
      });
    });
    filterLogEventsFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
      resolve({
        events: [
          { timestamp: 1477366175, message: 'START RequestId: 123 Version: $LATEST' },
          { timestamp: 1477366185, message: 'REPORT RequestId: 123 21.79 ms Billed Duration: 100 ms Memory Size: 256 MB Max Memory Used: 14 MB' },
          { timestamp: 1477366195, message: 'END RequestId: 123' }
        ]
      });
    });

    session = {
      aws: {
        cwl: {
          describeLogStreams: describeLogStreamsFn,
          filterLogEvents: filterLogEventsFn
        }
      }
    };
  });

  context('when log group name exists', function() {
    it('responds all logs from cloudwatch log', function() {
      return functionLogs(session, [functionPhysicalResourceName], null)
        .then(function(logs) {
          expect(logs).to.not.be.null;
          expect(logs).to.have.lengthOf(1);
          expect(logs[0].logGroupName).to.equal('/aws/lambda/resourceName');
          expect(logs[0].allLogs).to.have.lengthOf(3);
          expect(describeLogStreamsFn).to.have.been.calledOnce;
          expect(describeLogStreamsFn).to.have.been.calledWith({
            logGroupName: `/aws/lambda/${functionPhysicalResourceName}`,
            descending: true,
            orderBy: 'LastEventTime'
          });
          expect(filterLogEventsFn).to.have.been.calledOnce;
          expect(filterLogEventsFn).to.have.been.calledWith({
            logGroupName: `/aws/lambda/${functionPhysicalResourceName}`,
            interleaved: false,
            logStreamNames: ['stream 1', 'stream 2', 'stream 3'],
            startTime: null
          });
        });
    });
  });

  context("when log group name doesn't exist", function() {
    beforeEach(function() {
      describeLogStreamsFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
        reject({ message: 'does not exist' });
      });

      session.aws.cwl.describeLogStreams = describeLogStreamsFn;
    });

    it('returns an error', function() {
      return functionLogs(session, ['pitbull'], null)
        .then(function() {
          fail('unexpected then');
        })
        .catch(function(err) {
          expect(err).to.not.be.null;
          expect(describeLogStreamsFn).to.have.been.calledOnce;
          expect(describeLogStreamsFn).to.have.been.calledWith({
            logGroupName: '/aws/lambda/pitbull',
            descending: true,
            orderBy: 'LastEventTime'
          });
          expect(filterLogEventsFn).to.not.have.been.called;
        });
    });
  });
});
