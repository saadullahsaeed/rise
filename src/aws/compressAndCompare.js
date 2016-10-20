'use strict';

const fs = require('fs'),
      os = require('os'),
      path = require('path'),
      archiver = require('archiver'),
      uuid = require('uuid'),
      log = require('../utils/log'),
      fsStat = require('../utils/fs').fsStat,
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports = function compressAndCompare(nfx) {
  const funcNames = Object.keys(nfx.functions),
        compressPromises = [];

  for (let i = 0; i < funcNames.length; ++i) {
    const funcName = funcNames[i];

    if (funcName === 'default') {
      continue;
    }

    compressPromises.push(compress(nfx, funcName));
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

        log.info(`Current active version is "${activeVersion}". Deploying "${nfx.version}"...`);
      }

      nfx.nfxJSON.version_hashes[nfx.version] = checksumHex;

      return Promise.resolve(nfx);
    });
};

function compress(nfx, functionName) {
  return new Promise((resolve, reject) => {
    log.info(`Compressing ${functionName}...`);

    const functionPath = path.join('functions', functionName),
          stat = fsStat(functionPath);

    if (!stat || !stat.isDirectory()) {
      reject(`functions folder for "${functionName}" is invalid`);
      return;
    }

    const zipArchive = archiver.create('zip'),
          fileName = `${functionName}-${uuid.v4()}.zip`,
          tempFileName = path.join(os.tmpdir(), fileName),
          output = fs.createWriteStream(tempFileName);

    output.on('close', () => {
      log.info(`Compressed ${functionName}.`);
      resolve();
    });

    nfx.compressedFunctions.push({
      functionName,
      fileName,
      filePath: tempFileName
    });

    const indexJS = fsReadFile(path.join(__dirname, 'nfx-index.js.tmpl'))
                      .replace(/\$\{functionPath\}/, functionPath);

    zipArchive.pipe(output);
    zipArchive.directory(functionPath);
    zipArchive.glob("**/*", { ignore: 'functions/**'});
    zipArchive.append(indexJS, { name: 'index.js' });

    zipArchive.finalize();
  });
}

function checksumAll(hasher, funcs) {
  const files = ['routes.yaml', 'nfx.yaml'];
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
      log.info(`Calculated checksum of ${file}. Resolved.`);
      resolve(hasher);
    });
  });
}
