import JSZip from 'jszip';
import { cleanFilename, resolveFilename } from './filenames.js';
import { precompilePatterns, updateLinksCompiled } from './links.js';

const MAX_FILE_COUNT = 5000;
const MAX_SINGLE_FILE_SIZE = 10 * 1024 * 1024;

async function processZipData(arrayBuffer) {
  let zip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (e) {
    throw new Error('Failed to read ZIP file. It may be corrupted or not a valid ZIP.');
  }

  self.postMessage({ type: 'progress', percent: 30 });

  let nestedZipName = null;

  const flatFiles = Object.values(zip.files).filter((f) => !f.dir);
  if (flatFiles.length === 1 && flatFiles[0].name.toLowerCase().endsWith('.zip')) {
    nestedZipName = flatFiles[0].name;
    self.postMessage({
      type: 'status',
      message: `Step 1 of 4: Reading ZIP...\nDetected nested export: ${nestedZipName}`,
    });
    const innerBuffer = await flatFiles[0].async('arraybuffer');
    try {
      zip = await JSZip.loadAsync(innerBuffer);
    } catch (e) {
      throw new Error('Failed to read nested ZIP. It may be corrupted.');
    }
    self.postMessage({ type: 'progress', percent: 35 });
  }

  const allFiles = Object.values(zip.files).filter((f) => !f.dir);
  if (allFiles.length > MAX_FILE_COUNT) {
    throw new Error(`ZIP contains too many files (${allFiles.length}). Maximum is ${MAX_FILE_COUNT}.`);
  }

  self.postMessage({ type: 'status', message: 'Step 2 of 4: Cleaning filenames...' });
  const fileRenames = [];
  const usedPaths = new Set();
  const duplicates = [];

  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;

    const segments = relativePath.split('/');
    const fileName = segments.pop();
    const cleanedFileName = cleanFilename(fileName);

    if (cleanedFileName !== fileName) {
      const directory = segments.length ? `${segments.join('/')}/` : '';
      const proposedPath = `${directory}${cleanedFileName}`;

      const { finalPath, isDuplicate } = resolveFilename(proposedPath, usedPaths);
      if (isDuplicate) {
        duplicates.push(`${cleanedFileName} -> ${finalPath.split('/').pop()}`);
      }

      const extMatch = cleanedFileName.match(/\.([^.]+)$/);
      const extension = extMatch ? extMatch[1].toLowerCase() : '';

      fileRenames.push({ oldPath: relativePath, newPath: finalPath, extension });
    } else {
      const directory = segments.length ? `${segments.join('/')}/` : '';
      usedPaths.add(`${directory}${fileName}`);
    }
  });

  self.postMessage({ type: 'progress', percent: 40 });

  const compiledPatterns = precompilePatterns(fileRenames);

  const newZip = new JSZip();
  let filesProcessed = 0;
  let linksUpdatedCount = 0;
  let skippedLargeFiles = 0;
  const totalFiles = allFiles.length;

  self.postMessage({ type: 'status', message: 'Step 3 of 4: Updating internal links...' });

  for (const relativePath in zip.files) {
    const zipEntry = zip.files[relativePath];
    if (zipEntry.dir) {
      newZip.folder(relativePath);
      continue;
    }

    const rename = fileRenames.find((r) => r.oldPath === relativePath);
    const finalPath = rename ? rename.newPath : relativePath;
    const extension = relativePath.split('.').pop().toLowerCase();
    const isLinkUpdatable = extension === 'md' || extension === 'html';

    if (isLinkUpdatable) {
      const uncompressedSize = zipEntry._data && zipEntry._data.uncompressedSize;
      if (uncompressedSize && uncompressedSize > MAX_SINGLE_FILE_SIZE) {
        const raw = await zipEntry.async('uint8array');
        newZip.file(finalPath, raw);
        skippedLargeFiles++;
      } else {
        let content = await zipEntry.async('string');
        const originalContent = content;
        content = updateLinksCompiled(content, compiledPatterns);
        if (content !== originalContent) {
          linksUpdatedCount++;
        }
        newZip.file(finalPath, content);
      }
    } else {
      const raw = await zipEntry.async('uint8array');
      newZip.file(finalPath, raw);
    }

    filesProcessed++;
    if (filesProcessed % 20 === 0 || filesProcessed === totalFiles) {
      self.postMessage({ type: 'progress', percent: 40 + (filesProcessed / totalFiles) * 50 });
    }
  }

  self.postMessage({ type: 'progress', percent: 95 });
  self.postMessage({ type: 'status', message: 'Step 4 of 4: Packaging cleaned export...' });

  const cleanZipBuffer = await newZip.generateAsync({ type: 'arraybuffer' });

  const sampleRenames = fileRenames.slice(0, 10).map((r) => ({
    oldName: r.oldPath.split('/').pop(),
    newName: r.newPath.split('/').pop(),
  }));

  return {
    cleanZipBuffer,
    fileRenamesCount: fileRenames.length,
    linksUpdatedCount,
    duplicates,
    skippedLargeFiles,
    nestedZipName,
    sampleRenames,
    totalFiles: allFiles.length,
  };
}

self.onmessage = async function (e) {
  const { type, arrayBuffer } = e.data;

  if (type === 'process') {
    try {
      const result = await processZipData(arrayBuffer);
      self.postMessage({ type: 'complete', result }, [result.cleanZipBuffer]);
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
    }
  }
};
