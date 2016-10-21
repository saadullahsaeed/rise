'use strict';

const compressAndCompare = require('../src/aws/compressAndCompare'),
      fs = require('fs'),
      crypto = require('crypto'),
      yaml = require('js-yaml'),
      path = require('path'),
      tmp = require('tmp'),
      unzip = require('adm-zip'),
      fsReadFile = require('../src/utils/fs').fsReadFile;

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
              function: 'listTasks',
              cors: true
            }
          },
          put: {
            'x-nfx': {
              function: 'createTasks',
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
      listTasks: {
        memory: 128,
        timeout: 1
      },
      createTasks: {
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
    const indexFnPath = path.join(tmpDir.name, 'functions', 'listTasks');
    const createFnPath = path.join(tmpDir.name, 'functions', 'createTasks');
    const indexFile = path.join(indexFnPath, 'index.js');
    const createFile = path.join(createFnPath, 'create.js');
    fs.mkdirSync(appDir);
    fs.mkdirSync(indexFnPath);
    fs.mkdirSync(createFnPath);
    fs.writeFileSync(indexFile, "console.log('index!');", { encoding: 'utf8' });
    fs.writeFileSync(createFile, "console.log('create!');", { encoding: 'utf8' });

    // lib functions
    const libDir = path.join(tmpDir.name, 'lib');
    const libFnPath = path.join(tmpDir.name, 'lib', 'lib.js');
    fs.mkdirSync(libDir);
    fs.writeFileSync(libFnPath, "console.log('lib!');", { encoding: 'utf8' });

    // To cleanup later
    funcFiles.push(routesYAMLPath);
    funcFiles.push(funcsYAMLPath);
    funcFiles.push(indexFile);
    funcFiles.push(createFile);
    funcFiles.push(indexFnPath);
    funcFiles.push(createFnPath);
    funcFiles.push(appDir);
    funcFiles.push(libFnPath);
    funcFiles.push(libDir);

    nfx = {
      functions: funcsJSON,
      compressedFunctions: [],
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
          fs.rmdirSync(p);
        } else {
          fs.unlinkSync(p);
        }
      }

      for (let i = 0; i < nfx.compressedFunctions.length; ++i) {
        const p = nfx.compressedFunctions[i].filePath;
        fs.unlinkSync(p);
      }

      tmpDir.removeCallback();
    }
  });

  it('updates version and hash for next version', function(done) {
    compressAndCompare(nfx)
      .then(function(nfx) {
        expect(nfx.version).to.equal('v2');
        expect(nfx.nfxJSON.active_version).to.equal('v1');
        expect(nfx.nfxJSON.version_hashes['v2']).to.not.be.null;
        done();
      })
      .catch(done);
  });

  it('compresses files for each function', function(done) {
    const expectedFiles = {
      listTasks: [
        "functions/listTasks/index.js",
        "routes.yaml",
        "nfx.yaml",
        "index.js",
        "lib/",
        "lib/lib.js"
      ],
      createTasks: [
        "functions/createTasks/create.js",
        "routes.yaml",
        "nfx.yaml",
        "index.js",
        "lib/",
        "lib/lib.js"
      ]
    };

    compressAndCompare(nfx)
      .then(function(nfx) {
        expect(nfx.compressedFunctions).to.have.length(2);
        for (let i = 0; i < nfx.compressedFunctions.length; ++i) {
          const p = nfx.compressedFunctions[i];
          expect(p.filePath).to.not.be.null;
          expect(fs.statSync(p.filePath)).to.not.be.null;

          const entries = new unzip(p.filePath).getEntries();
          expect(entries).to.not.be.empty;

          const paths = [];
          for (let j = 0; j < entries.length; j++) {
            if (!entries[j].isDirectory && entries[j].entryName != 'index.js') {
              expect(fsReadFile(entries[j].entryName)).to.equal(entries[j].getData().toString());
            }
            paths.push(entries[j].entryName);
          }
          expect(paths).same.members(expectedFiles[p.functionName]);
        }
        done();
      })
      .catch(done);
  });
});
