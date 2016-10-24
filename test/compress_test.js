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

  const createFolder = function(path) {
          fs.mkdirSync(path);
          funcFiles.push(path);
        },
        writeFile = function(path, content) {
          fs.writeFileSync(path, content, { encoding: 'utf8' });
          funcFiles.push(path);
        };

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
              function: 'listTasks'
            }
          },
          put: {
            'x-nfx': {
              function: 'createTasks'
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
        timeout: 3,
        exclude: 'CHANGELOG.*'
      },
      listTasks: {
        memory: 128,
        timeout: 1,
        exclude: 'README.*'
      },
      createTasks: null
    };

    // config yaml files
    writeFile(path.join(tmpDir.name, 'routes.yaml'), yaml.safeDump(routesJSON));
    writeFile(path.join(tmpDir.name, 'nfx.yaml'), yaml.safeDump({
      profiles: profilesJSON,
      functions: funcsJSON
    }));

    // function files
    const appDir = path.join(tmpDir.name, 'functions');
    const indexFnPath = path.join(tmpDir.name, 'functions', 'listTasks');
    const createFnPath = path.join(tmpDir.name, 'functions', 'createTasks');

    createFolder(appDir);
    createFolder(indexFnPath);
    createFolder(createFnPath);
    writeFile(path.join(indexFnPath, 'index.js'), "console.log('index!');");
    writeFile(path.join(createFnPath, 'create.js'), "console.log('create!');");

    // lib functions
    const libDir = path.join(tmpDir.name, 'lib');
    createFolder(libDir);
    writeFile(path.join(libDir, 'lib.js'), "console.log('lib!');");

    // README.md
    writeFile(path.join(tmpDir.name, 'README.md'), "# README");

    // CHANGELOG.md
    writeFile(path.join(tmpDir.name, 'CHANGELOG.md'), "# No updates");

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
    for (let i = 0; i < nfx.compressedFunctions.length; ++i) {
      const p = nfx.compressedFunctions[i].filePath;
      fs.unlinkSync(p);
    }

    if (tmpDir) {
      for (let i = funcFiles.length - 1; i >= 0; --i) {
        const p = funcFiles[i];
        if (fs.statSync(p).isDirectory()) {
          fs.rmdirSync(p);
        } else {
          fs.unlinkSync(p);
        }
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
        "lib/lib.js",
        "README.md"
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
            if (!entries[j].isDirectory && entries[j].entryName !== 'index.js') {
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
