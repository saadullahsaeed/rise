'use strict';

const fs = require('fs'),
      os = require('os'),
      path = require('path'),
      archiver = require('archiver'),
      uuid = require('uuid'),
      titlecase = require('../utils/stringHelper'),
      log = require('../utils/log');

module.exports = function compressAndCompare(nfx) {
  const funcPaths = Object.keys(nfx.functions),
        compressPromises = [];

  for (let i = 0; i < funcPaths.length; ++i) {
    const funcPath = funcPaths[i];
    const funcName = titlecase(funcPath, path.sep);

    if (funcPath === 'default') {
      continue;
    }

    compressPromises.push(compress(nfx, funcPath, funcName));
  }

  // TODO: Sanity check with functions.yaml.
  return Promise.all(compressPromises)
    .then(function() {
      return checksumAll(nfx.hasher, nfx.compressedFunctions);
    })
    .then(() => {
      nfx.hasher.end();
      const checksumHex = nfx.hasher.read().toString('hex'),
            activeVersion = nfx.nfxJSON.active_version,
            activeVersionHash = nfx.nfxJSON.version_hashes[nfx.nfxJSON.active_version];

      if (activeVersionHash === checksumHex) {
        for (let i = 0; i < nfx.compressedFunctions.length; ++i) {
          fs.unlinkSync(nfx.compressedFunctions[i].filePath);
        }
        return Promise.reject("No change is present");
      }

      if (!activeVersion) {
        log.info('Deploying the first version');
        nfx.version = 'v1';
      } else {
        nfx.previousVersion = activeVersion;
        nfx.version = `v${(parseInt(activeVersion.substr(1) || 0) + 1)}`;
        for (let i = 0; i < nfx.compressedFunctions.length; ++i) {
          const fileName = nfx.compressedFunctions[i].fileName,
                uploadPath = `versions/${nfx.version}/functions/${fileName}`;

          nfx.compressedFunctions[i].uploadPath = uploadPath;
        }

        log.info(`Current active version is "${activeVersion}". Deploying "${nfx.version}"`);
      }

      nfx.nfxJSON.version_hashes[nfx.version] = checksumHex;

      return Promise.resolve(nfx);
    });
};

function compress(nfx, funcPath, funcName) {
  return new Promise((resolve/*, reject*/) => {
    log.info(`Compressing ${funcName}...`);

    const zipArchive = archiver.create('zip'),
          fileName = `${funcName}-${uuid.v4()}.zip`,
          tempFileName = path.join(os.tmpdir(), fileName),
          output = fs.createWriteStream(tempFileName);

    output.on('close', () => {
      log.info(`Compressed ${funcName}`);
      resolve();
    });

    nfx.compressedFunctions.push({
      functionPath: funcPath,
      functionName: funcName,
      fileName,
      filePath: tempFileName
    });

    zipArchive.pipe(output);
    zipArchive.bulk([
      { src: [ '**/*' ], cwd: funcPath, expand: true }
    ]);

    zipArchive.finalize();
  });
}

function checksumAll(hasher, funcs) {
  const files = ['api.yaml', 'functions.yaml'];
  for (let i = 0; i < funcs.length; ++i) {
    files.push(funcs[i].filePath);
  }

  return new Promise((resolve/*, reject*/) => {
    let cp = checksum(hasher, files[0]);
    for (let i = 1; i < files.length; ++i) {
      const file = files[i];
      cp = cp.then(function(hasher) {
        return checksum(hasher, file);
      });
    }
    cp.then(resolve).catch(log.error);
  });
}

function checksum(hasher, file) {
  return new Promise((resolve/*, reject*/) => {
    log.info(`Calculating checksum of ${file}...`);

    const readStream = fs.createReadStream(file);
    readStream.pipe(hasher, { end: false });
    readStream.once('end', function() {
      log.info(`Calculated checksum of ${file}. Resolved`);
      resolve(hasher);
    });
  });
}
