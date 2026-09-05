export const NOTION_ID_REGEX = /^(.*?)\s*[_-]?([a-f0-9]{32})(.*?)(\.[^.]+)?$/i;

export function cleanFilename(filename) {
  return filename.replace(
    NOTION_ID_REGEX,
    (match, base, uuid, extra, ext) => {
      if (extra && extra !== '_all') {
        return base + extra + (ext || '');
      }
      return base + (ext || '');
    }
  );
}

export function resolveFilename(newPath, usedPaths) {
  if (!usedPaths.has(newPath)) {
    usedPaths.add(newPath);
    return { finalPath: newPath, isDuplicate: false };
  }

  const lastDot = newPath.lastIndexOf('.');
  const basePath = lastDot > -1 ? newPath.substring(0, lastDot) : newPath;
  const ext = lastDot > -1 ? newPath.substring(lastDot) : '';

  let counter = 2;
  let candidate;
  do {
    candidate = `${basePath} (${counter})${ext}`;
    counter++;
  } while (usedPaths.has(candidate));

  usedPaths.add(candidate);
  return { finalPath: candidate, isDuplicate: true };
}
