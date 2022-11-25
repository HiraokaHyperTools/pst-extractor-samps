const fs = require('fs');
const globby = require('globby');
const { openPstFile } = require('@hiraokahypertools/pst-extractor');

const targets = fs.readFileSync('targets.txt', { encoding: 'utf-8' })
  .replace(/\r\n/g, "\n")
  .split('\n')
  .map(expandEnvironmentVariablesForWindows)
  .map(it => it.replace(/\\/g, "/"))
  .filter(it => it.length !== 0 && !it.startsWith(";"));

(async () => {
  for (let target of targets) {
    console.log(`# ${target}`);
    const paths = await globby(target);
    for (let fullPath of paths) {
      console.log(`## ${fullPath}`);

      await verify(fullPath);
    }
  }
}
)();

async function verify(fullPath) {
  const pstFile = await openPstFile(fullPath);

  async function walk(folder, prefix) {
    const fasterList = await folder.getFasterEmailList();
    for (let faster of fasterList) {
      console.log(`${faster.messageClass} ${faster.displayName}`);
    }

    const subFolderCount = await folder.getSubFolderCount();
    for (let idx = 0; idx < subFolderCount; idx++) {
      try {
        const subFolder = await folder.getSubFolder(idx);
        await walk(subFolder, `${prefix}/${subFolder.displayName}`);
      }
      catch (ex) {
        console.error(`w: ${prefix}/Folder#${idx} // ${ex}`);
      }
    }
  }

  const root = await pstFile.getRootFolder();
  await walk(root, root.displayName);

  pstFile.close();
}

function expandEnvironmentVariablesForWindows(str) {
  // See: https://stackoverflow.com/a/21363956
  return str.replace(/%([^%]+)%/g, (_, n) => process.env[n])
}
