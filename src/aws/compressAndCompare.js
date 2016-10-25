'use strict';

const fs = require('fs'),
      os = require('os'),
      path = require('path'),
      archiver = require('archiver'),
      uuid = require('uuid'),
      log = require('../utils/log'),
      checksum = require('../utils/checksum'),
      fsStat = require('../utils/fs').fsStat,
      fsReadFile = require('../utils/fs').fsReadFile;

module.exports = function compressAndCompare(nfx) {
  const funcNames = Object.keys(nfx.functions),
        compressPromises = [],
        defaultFuncSetting = nfx.functions.default;

  let globalExcludePattern = null;

  if (defaultFuncSetting && typeof defaultFuncSetting.exclude === 'string') {
    globalExcludePattern = defaultFuncSetting.exclude;
  }

  return checksum(globalExcludePattern)
    .then((checksumHex) => {
      const activeVersion = nfx.nfxJSON.active_version,
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
        log.info(`Current active version is "${activeVersion}". Uploading "${nfx.version}"...`);
      }

      nfx.nfxJSON.version_hashes[nfx.version] = checksumHex;

      for (let i = 0; i < funcNames.length; ++i) {
        const funcName = funcNames[i];

        if (funcName === 'default') {
          continue;
        }

        const excludePatterns = [];
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

    zipArchive.pipe(output);
    zipArchive.directory(functionPath);
    zipArchive.glob("**/*", { ignore: excludePatterns.concat(['functions/**']) });

    const indexJS = fsReadFile(path.join(__dirname, 'nfx-index.js.tmpl'))
                      .replace(/\$\{functionPath\}/, functionPath);

    zipArchive.append(indexJS, { name: 'index.js' });
    zipArchive.finalize();
  });
}
