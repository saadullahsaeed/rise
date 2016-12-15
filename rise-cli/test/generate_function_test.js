'use strict';

const generateFunction = require('../src/generate/generateFunction'),
      fs = require('fs-extra'),
      yaml = require('js-yaml'),
      path = require('path'),
      tmp = require('tmp');

describe('compressAndCompare', function() {
  let cwdOrig,
      routes,
      profiles,
      tmpDir;

  beforeEach(function() {
    cwdOrig = process.cwd();
    tmpDir = tmp.dirSync();

    process.chdir(tmpDir.name);
    routes = {
      'x-rise': {},
      paths: {}
    };

    profiles = {
      default: {
        provider: 'aws',
        region: 'us-west-2',
        bucket: 'test-bucket'
      }
    };

    // config yaml files
    fs.writeFileSync(path.join(tmpDir.name, 'routes.yaml'), yaml.safeDump(routes), { encoding: 'utf8'});
    fs.writeFileSync(path.join(tmpDir.name, 'rise.yaml'), yaml.safeDump({
      profiles,
      stack: 'my-test-stack',
      functions: {}
    }), { encoding: 'utf8' });
  });

  afterEach(function() {
    process.chdir(cwdOrig);
    fs.removeSync(tmpDir.name);
  });

  it('creates index.js file and updates rise.yaml and routes.yaml file', function() {
    const err = generateFunction('testfunction');
    expect(err).not.to.exist;

    const indexFileContent = fs.readFileSync('functions/testfunction/index.js', {encoding: 'utf8'});
    expect(indexFileContent).to.equal(`'use strict';

exports.handle = (req, res, next) => {
  res.send({status: 'ok'});
  next();
};`);
    const riseYAML = yaml.safeLoad(fs.readFileSync(path.join('rise.yaml'), { encoding: 'utf8' }));
    expect(riseYAML.functions.testfunction).to.exist;

    const routesYAML = yaml.safeLoad(fs.readFileSync(path.join('routes.yaml'), { encoding: 'utf8' }));
    expect(routesYAML.paths['/testfunction']).to.deep.equal({
      get: {
        'x-rise': {
          'function': 'testfunction'
        }
      }
    });
  });

  context('when the folder exist', function() {
    beforeEach(function() {
      fs.mkdirSync('functions');
      fs.mkdirSync(path.join('functions', 'testfunction'));
    });

    it('creates index.js file in the existing folder and updates rise.yaml file', function() {
      const err = generateFunction('testfunction');
      expect(err).not.to.exist;

      const indexFileContent = fs.readFileSync('functions/testfunction/index.js', {encoding: 'utf8'});
      expect(indexFileContent).to.equal(`'use strict';

exports.handle = (req, res, next) => {
  res.send({status: 'ok'});
  next();
};`);

      const riseYAML = yaml.safeLoad(fs.readFileSync(path.join('rise.yaml'), {encoding: 'utf8'}));
      expect(riseYAML.functions.testfunction).to.exist;
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

        const riseYAML = yaml.safeLoad(fs.readFileSync(path.join('rise.yaml'), {encoding: 'utf8'}));
        expect(riseYAML.functions.testfunction).to.exist;
      });
    });
  });

  context('when the function exists in rise.yaml', function() {
    beforeEach(function() {
      fs.writeFileSync(path.join(tmpDir.name, 'rise.yaml'), yaml.safeDump({
        profiles,
        stack: 'my-test-stack',
        functions: {
          testfunction: {
            timeout: 8
          }
        }
      }), { encoding: 'utf8' });
    });

    it("does not the settting in rise.yaml", function() {
      const err = generateFunction('testfunction');
      expect(err).not.to.exist;

      const indexFileContent = fs.readFileSync('functions/testfunction/index.js', {encoding: 'utf8'});
      expect(indexFileContent).to.equal(`'use strict';

exports.handle = (req, res, next) => {
  res.send({status: 'ok'});
  next();
};`);

      const riseYAML = yaml.safeLoad(fs.readFileSync(path.join('rise.yaml'), { encoding: 'utf8' }));
      expect(riseYAML.functions.testfunction).to.deep.equal({ timeout: 8 });
    });
  });

  context('when the function exists in routes.yaml', function() {
    beforeEach(function() {
      fs.writeFileSync(path.join(tmpDir.name, 'routes.yaml'), yaml.safeDump({
        paths: {
          '/testfunction': {
            put: {
              'x-rise': {
                'function': 'testfunction',
                cors: true
              }
            }
          }
        }
      }), { encoding: 'utf8' });
    });

    it("does not the settting in rise.yaml", function() {
      const err = generateFunction('testfunction');
      expect(err).not.to.exist;

      const indexFileContent = fs.readFileSync('functions/testfunction/index.js', {encoding: 'utf8'});
      expect(indexFileContent).to.equal(`'use strict';

exports.handle = (req, res, next) => {
  res.send({status: 'ok'});
  next();
};`);

      const routesYAML = yaml.safeLoad(fs.readFileSync(path.join('routes.yaml'), { encoding: 'utf8' }));
      expect(routesYAML.paths['/testfunction']).to.deep.equal({
        put: {
          'x-rise': {
            'function': 'testfunction',
            cors: true
          }
        }
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

      const riseYAML = yaml.safeLoad(fs.readFileSync(path.join('rise.yaml'), {encoding: 'utf8'}));
      expect(riseYAML.functions.testfunction).not.to.exist;
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
