'use strict';

const fs = require('fs'),
      os = require('os'),
      path = require('path'),
      uuid = require('uuid'),
      archiver = require('archiver'),
      log = require('../utils/log'),
      checksum = require('../utils/checksum'),
      fsStat = require('../utils/fs').fsStat,
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports = function compressAndCompare(nfx) {
  if (!nfx.functions || Object.keys(nfx.functions).length === 0) {
    return Promise.reject("No functions found in nfx.yaml.");
  }

  const funcNames = Object.keys(nfx.functions),
        defaultFuncSetting = nfx.functions.default;

  let globalExcludePattern = null;

  if (defaultFuncSetting && typeof defaultFuncSetting.exclude === 'string') {
    globalExcludePattern = defaultFuncSetting.exclude;
  }

  return checksum(globalExcludePattern)
    .then((checksumHex) => {
      const activeVersion = nfx.nfxJSON.active_version,
            activeVersionHash = nfx.nfxJSON.version_hashes[nfx.nfxJSON.active_version],
            compressPromises = [];

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
        log.info(`Current active version is "${activeVersion}". Uploading "${nfx.version}"...`);
      }

      nfx.nfxJSON.version_hashes[nfx.version] = checksumHex;

      for (let i = 0; i < funcNames.length; ++i) {
        const funcName = funcNames[i],
              excludePatterns = [];

        if (funcName === 'default') {
          continue;
        }

        if (globalExcludePattern != null) {
          excludePatterns.push(globalExcludePattern);
        }

        if (nfx.functions[funcName] && typeof nfx.functions[funcName].exclude === 'string') {
          excludePatterns.push(nfx.functions[funcName].exclude);
        }

        compressPromises.push(compress(nfx, funcName, excludePatterns));
      }

      return Promise.all(compressPromises);
    })
    .then(() => {
      for (let i = 0; i < nfx.compressedFunctions.length; ++i) {
        const fileName = nfx.compressedFunctions[i].fileName,
              uploadPath = `versions/${nfx.version}/functions/${fileName}`;

        nfx.compressedFunctions[i].uploadPath = uploadPath;
      }

      return Promise.resolve(nfx);
    });
};

function compress(nfx, functionName, excludePatterns) {
  return new Promise((resolve, reject) => {
    process.nextTick(function() {
      log.info(`Compressing ${functionName}...`);

      const functionPath = path.join('functions', functionName),
            stat = fsStat(functionPath);

      if (!stat || !stat.isDirectory()) {
        reject(`"${functionPath}" is invalid or does not exist`);
        return;
      }

      const zipArchive = archiver.create('zip'),
            fileName = `${functionName}-${uuid.v4()}.zip`,
            tempFileName = path.join(os.tmpdir(), fileName),
            output = fs.createWriteStream(tempFileName);

      output.on('close', function() {
        log.info(`Compressed ${functionName}.`);
        resolve();
      });

      zipArchive.on('error', function(err) {
        reject(err);
      });

      nfx.compressedFunctions.push({
        functionName,
        fileName,
        filePath: tempFileName
      });

      zipArchive.pipe(output);
      zipArchive.directory(functionPath);
      zipArchive.glob("**/*", { ignore: excludePatterns.concat(['functions/**']) });

      const indexJS = fsReadFile(path.join(__dirname, 'nfx-index.js.tmpl'))
      .replace(/\$\{functionPath\}/, functionPath);

      zipArchive.append(indexJS, { name: 'index.js' });
      zipArchive.finalize();
    });
  });
}
