'use strict';

const uploadNFXFiles = require('../src/aws/uploadNFXFiles'),
      fs = require('fs-extra'),
      yaml = require('js-yaml'),
      path = require('path'),
      tmp = require('tmp');

describe('uploadNFXFiles', function() {
  let nfx,
      cwdOrig,
      putObjectFn,
      routes,
      profiles,
      functions,
      tmpDir;

  beforeEach(function() {
    cwdOrig = process.cwd();
    tmpDir = tmp.dirSync();
    process.chdir(tmpDir.name);

    putObjectFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
      resolve();
    });

    routes = {
      'x-nfx': {
        default: {
          cors: true
        }
      },
      paths: {
        '/': {
          get: {
            'x-nfx': {
              function: 'listTasks'
            }
          }
        }
      }
    };

    profiles = {
      default: {
        provider: 'aws',
        region: 'us-west-2',
        bucket: 'test-bucket'
      }
    };

    functions = {
      default: {
        memory: 128,
        timeout: 3
      },
      listTasks: {
        memory: 128,
        timeout: 1
      }
    };

    // config yaml files
    fs.writeFileSync(path.join(tmpDir.name, 'routes.yaml'), yaml.safeDump(routes), { encoding: 'utf8'});
    fs.writeFileSync(path.join(tmpDir.name, 'nfx.yaml'), yaml.safeDump({
      stack: 'my-test-stack',
      profiles,
      functions
    }), { encoding: 'utf8' });

    nfx = {
      nfxJSON: {
        uuid: "a1b2c3",
        active_version: "v2",
        version_hashes: {
          v1: "12345",
          v2: "67890"
        }
      },
      bucketName: 'my-bucket',
      version: 'v2',
      aws: {
        cfTemplate: {
          SomeData: 'SomeValue'
        },
        s3: {
          putObject: putObjectFn
        }
      }
    };
  });

  afterEach(function() {
    process.chdir(cwdOrig);
    fs.removeSync(tmpDir.name);
  });

  it('uploads cf.json to s3', function() {
    return uploadNFXFiles(nfx)
      .then(function() {
        expect(putObjectFn.callCount).to.equal(4);

        const args = putObjectFn.getCall(0).args[0];
        expect(args.Bucket).to.equal('my-bucket');
        expect(args.Key).to.equal('versions/v2/aws/cf.json');
        expect(args.ACL).to.equal('private');
        expect(args.ContentType).to.equal('application/json');
        expect(JSON.parse(args.Body)).to.deep.equal(nfx.aws.cfTemplate);
      });
  });

  it('uploads routes.yaml to s3', function() {
    return uploadNFXFiles(nfx)
      .then(function() {
        expect(putObjectFn.callCount).to.equal(4);

        const args = putObjectFn.getCall(1).args[0];
        expect(args.Bucket).to.equal('my-bucket');
        expect(args.Key).to.equal('versions/v2/routes.yaml');
        expect(args.ACL).to.equal('private');
        expect(args.ContentType).to.equal('text/yaml');

        const stream = args.Body;
        let data = '',
            ended = false;

        stream.setEncoding('utf8');
        stream.on('data', function(c) {
          data += c;
        });

        stream.on('end', function() {
          ended = true;
        });

        return waitUntil(() => ended).then(() => {
          expect(yaml.safeLoad(data)).to.deep.equal(routes);
        });
      });
  });

  it('uploads nfx.yaml to s3', function() {
    return uploadNFXFiles(nfx)
      .then(function() {
        expect(putObjectFn.callCount).to.equal(4);

        const args = putObjectFn.getCall(2).args[0];
        expect(args.Bucket).to.equal('my-bucket');
        expect(args.Key).to.equal('versions/v2/nfx.yaml');
        expect(args.ACL).to.equal('private');
        expect(args.ContentType).to.equal('text/yaml');

        const stream = args.Body;
        let data = '',
            ended = false;

        stream.setEncoding('utf8');
        stream.on('data', function(c) {
          data += c;
        });

        stream.on('end', function() {
          ended = true;
        });

        return waitUntil(() => ended).then(() => {
          expect(yaml.safeLoad(data)).to.deep.equal({
            stack: 'my-test-stack',
            profiles,
            functions
          });
        });
      });
  });

  it('uploads nfx.json to s3', function() {
    return uploadNFXFiles(nfx)
      .then(function() {
        expect(putObjectFn.callCount).to.equal(4);

        const args = putObjectFn.getCall(3).args[0];
        expect(args.Bucket).to.equal('my-bucket');
        expect(args.Key).to.equal('nfx.json');
        expect(args.ACL).to.equal('private');
        expect(args.ContentType).to.equal('application/json');
        expect(JSON.parse(args.Body)).to.deep.equal(nfx.nfxJSON);
      });
  });
});
