'use strict';

const generateFunction = require('../src/generate/generateFunction'),
      fs = require('fs-extra'),
      yaml = require('js-yaml'),
      path = require('path'),
      tmp = require('tmp');

describe('compressAndCompare', function() {
  let cwdOrig,
      profilesJSON,
      tmpDir;

  beforeEach(function() {
    cwdOrig = process.cwd();
    tmpDir = tmp.dirSync();

    process.chdir(tmpDir.name);
    profilesJSON = {
      default: {
        provider: 'aws',
        region: 'us-west-2',
        bucket: 'test-bucket'
      }
    };

    // config yaml files
    fs.writeFileSync(path.join(tmpDir.name, 'nfx.yaml'), yaml.safeDump({
      profiles: profilesJSON,
      stack: 'my-test-stack',
      functions: {}
    }), { encoding: 'utf8' });
  });

  afterEach(function() {
    process.chdir(cwdOrig);
    fs.removeSync(tmpDir.name);
  });

  it('creates index.js file and updates nfx.yaml file', function() {
    const err = generateFunction('testfunction');
    expect(err).not.to.exist;

    const origIndexContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'generate', 'basic-index.js'), {encoding: 'utf8'}),
          indexFileContent = fs.readFileSync('functions/testfunction/index.js', {encoding: 'utf8'});

    expect(indexFileContent).to.exist;
    expect(indexFileContent).to.equal(origIndexContent);

    const nfxYAML = yaml.safeLoad(fs.readFileSync(path.join('nfx.yaml'), {encoding: 'utf8'}));
    expect(nfxYAML.functions.testfunction).to.exist;
  });

  context('when the folder exist', function() {
    beforeEach(function() {
      fs.mkdirSync('functions');
      fs.mkdirSync(path.join('functions', 'testfunction'));
    });

    it('creates index.js file in the existing folder and updates nfx.yaml file', function() {
      const err = generateFunction('testfunction');
      expect(err).not.to.exist;

      const origIndexContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'generate', 'basic-index.js'), {encoding: 'utf8'}),
            indexFileContent = fs.readFileSync('functions/testfunction/index.js', {encoding: 'utf8'});

      expect(indexFileContent).to.exist;
      expect(indexFileContent).to.equal(origIndexContent);

      const nfxYAML = yaml.safeLoad(fs.readFileSync(path.join('nfx.yaml'), {encoding: 'utf8'}));
      expect(nfxYAML.functions.testfunction).to.exist;
    });

    context('when the index file exist', function() {
      beforeEach(function() {
        fs.writeFileSync(path.join('functions', 'testfunction', 'index.js'), 'console.log("exisiting function");', { encoding: 'utf8'});
      });

      it("does not overwrite file but update file", function() {
        const err = generateFunction('testfunction');
        expect(err).not.to.exist;

        const indexFileContent = fs.readFileSync('functions/testfunction/index.js', {encoding: 'utf8'});

        expect(indexFileContent).to.exist;
        expect(indexFileContent).to.equal('console.log("exisiting function");');

        const nfxYAML = yaml.safeLoad(fs.readFileSync(path.join('nfx.yaml'), {encoding: 'utf8'}));
        expect(nfxYAML.functions.testfunction).to.exist;
      });
    });

    context('when the function exists in nfx.json', function() {
      beforeEach(function() {
        fs.writeFileSync(path.join(tmpDir.name, 'nfx.yaml'), yaml.safeDump({
          profiles: profilesJSON,
          stack: 'my-test-stack',
          functions: {
            testfunction: {
              timeout: 8
            }
          }
        }), { encoding: 'utf8' });
      });

      it("does not the settting in nfx.json", function() {
        const err = generateFunction('testfunction');
        expect(err).not.to.exist;

        const origIndexContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'generate', 'basic-index.js'), {encoding: 'utf8'}),
              indexFileContent = fs.readFileSync('functions/testfunction/index.js', {encoding: 'utf8'});

        expect(indexFileContent).to.exist;
        expect(indexFileContent).to.equal(origIndexContent);

        const nfxYAML = yaml.safeLoad(fs.readFileSync(path.join('nfx.yaml'), {encoding: 'utf8'}));
        expect(nfxYAML.functions.testfunction).to.deep.equal({ timeout: 8 });
      });
    });
  });

  context("when function name is invalid", function() {
    const assertNoChange = function() {
      let stat = null;
      /* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
      try {
        stat = fs.statSync('functions');
      } catch (e) {} // eslint-disable-line no-empty

      expect(stat).to.be.null;

      const nfxYAML = yaml.safeLoad(fs.readFileSync(path.join('nfx.yaml'), {encoding: 'utf8'}));
      expect(nfxYAML.functions.testfunction).not.to.exist;
    };

    it("returns an error when the name is too short", function() {
      const err = generateFunction('tt');
      expect(err).to.exist;

      assertNoChange();
    });

    it("returns an error when the name is not alphanumeric", function() {
      const err = generateFunction('test-function');
      expect(err).to.exist;

      assertNoChange();
    });
  });
});

