'use strict';

const compressAndCompare = require('../src/aws/compressAndCompare'),
      fs = require('fs'),
      crypto = require('crypto'),
      yaml = require('js-yaml'),
      path = require('path'),
      tmp = require('tmp');

describe('compressAndCompare', function() {
  let nfx,
      cwdOrig,
      tmpDir,
      funcFiles;

  beforeEach(function() {
    cwdOrig = process.cwd();
    tmpDir = tmp.dirSync();
    funcFiles = [];

    process.chdir(tmpDir.name);

    const routesJSON = {
      paths: {
        '/': {
          get: {
            'x-nfx': {
              handler: 'todoIndex',
              cors: true
            }
          },
          put: {
            'x-nfx': {
              handler: 'todoCreate',
              cors: true
            }
          }
        }
      }
    };

    const profilesJSON = {
      default: {
        provider: 'aws',
        region: 'us-west-2',
        bucket: 'test-bucket'
      }
    };

    const funcsJSON = {
      default: {
        memory: 128,
        timeout: 3
      },
      'index': {
        handler: 'index',
        memory: 128,
        timeout: 1
      },
      'create': {
        handler: 'create',
        memory: 128,
        timeout: 2
      }
    };

    // config yaml files
    const routesYAMLPath = path.join(tmpDir.name, 'routes.yaml');
    const funcsYAMLPath = path.join(tmpDir.name, 'nfx.yaml');
    fs.writeFileSync(routesYAMLPath, yaml.safeDump(routesJSON), { encoding: 'utf8' });
    fs.writeFileSync(funcsYAMLPath, yaml.safeDump({
      profiles: profilesJSON,
      functions: funcsJSON
    }), { encoding: 'utf8' });

    // function files
    const appDir = path.join(tmpDir.name, 'functions');
    const indexFnPath = path.join(tmpDir.name, 'functions', 'index');
    const createFnPath = path.join(tmpDir.name, 'functions', 'create');
    const indexFile = path.join(indexFnPath, 'index.js');
    const createFile = path.join(createFnPath, 'create.js');
    fs.mkdirSync(appDir);
    fs.mkdirSync(indexFnPath);
    fs.mkdirSync(createFnPath);
    fs.writeFileSync(indexFile, "console.log('index!');", { encoding: 'utf8' });
    fs.writeFileSync(createFile, "console.log('create!');", { encoding: 'utf8' });

    // To cleanup later
    funcFiles.push(routesYAMLPath);
    funcFiles.push(funcsYAMLPath);
    funcFiles.push(indexFile);
    funcFiles.push(createFile);
    funcFiles.push(indexFnPath);
    funcFiles.push(createFnPath);
    funcFiles.push(appDir);

    nfx = {
      functions: funcsJSON,
      compressedFunctions:[],
      hasher: crypto.createHash('sha256'),
      nfxJSON: {
        active_version: 'v1',
        version_hashes: {}
      }
    };
  });

  afterEach(function() {
    process.chdir(cwdOrig);
    if (tmpDir) {
      for (let i = 0; i < funcFiles.length; ++i) {
        const p = funcFiles[i];
        if (fs.statSync(p).isDirectory()) {
          fs.rmdir(p);
        } else {
          fs.unlink(p);
        }
      }

      for (let i = 0; i < nfx.compressedFunctions.length; ++i) {
        const p = nfx.compressedFunctions[i].filePath;
        fs.unlink(p);
      }

      tmpDir.removeCallback();
    }
  });

  it('updates version and hash', function(done) {
    compressAndCompare(nfx)
      .then(function(nfx) {
        expect(nfx.version).to.equal('v2');
        expect(nfx.nfxJSON.active_version).to.equal('v1');
        expect(nfx.nfxJSON.version_hashes['v2']).to.not.be.null;
        expect(nfx.compressedFunctions).to.have.length(2);
        for (let i = 0; i < nfx.compressedFunctions.length; ++i) {
          const p = nfx.compressedFunctions[i];
          expect(fs.statSync(p.filePath)).to.not.be.null;
        }
        done();
      })
      .catch(done);
  });
});
