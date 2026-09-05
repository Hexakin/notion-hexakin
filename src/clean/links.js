export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function precompilePatterns(fileRenames) {
  return fileRenames.map(({ oldPath, newPath }) => {
    const oldPathEscaped = escapeRegex(oldPath);
    const oldFileName = oldPath.split('/').pop();
    const newFileName = newPath.split('/').pop();
    const oldPathEncoded = encodeURIComponent(oldPath);
    const newPathEncoded = encodeURIComponent(newPath);
    const oldFileNameEncoded = encodeURIComponent(oldFileName);
    const newFileNameEncoded = encodeURIComponent(newFileName);

    const patterns = [];

    patterns.push({
      regex: new RegExp(`(\\(|(\\s|")\\./)${oldPathEscaped}([#?]|\\s|"|\\))`, 'gi'),
      from: oldPath,
      to: newPath,
    });

    patterns.push({
      regex: new RegExp(`(href=["'])${oldPathEscaped}(["'#?]|\\s|>)`, 'gi'),
      from: oldPath,
      to: newPath,
    });

    patterns.push({
      regex: new RegExp(`(href=["'])${escapeRegex(oldPathEncoded)}(["'#?]|\\s|>)`, 'gi'),
      from: oldPathEncoded,
      to: newPathEncoded,
    });

    if (oldFileName !== newFileName) {
      patterns.push({
        regex: new RegExp(`(\\(|(\\s|")\\.?/?([^"')\\/]*\\/)?)${escapeRegex(oldFileName)}([#?"'\\)]|\\s|$)`, 'gi'),
        from: oldFileName,
        to: newFileName,
        avoidDouble: oldPath,
      });

      patterns.push({
        regex: new RegExp(`(href=["']\\.?/?([^"'\\/]*\\/)?)${escapeRegex(oldFileName)}(["'#?]|\\s|>)`, 'gi'),
        from: oldFileName,
        to: newFileName,
        avoidDouble: oldPathEncoded,
      });

      patterns.push({
        regex: new RegExp(`(href=["']\\.?/?([^"'\\/]*\\/)?)${escapeRegex(oldFileNameEncoded)}(["'#?]|\\s|>)`, 'gi'),
        from: oldFileNameEncoded,
        to: newFileNameEncoded,
      });
    }

    return patterns;
  });
}

export function updateLinksCompiled(content, compiledPatterns) {
  let updatedContent = content;

  for (const patternSet of compiledPatterns) {
    for (const p of patternSet) {
      p.regex.lastIndex = 0;
      updatedContent = updatedContent.replace(p.regex, (match) => {
        if (p.avoidDouble && match.includes(p.avoidDouble)) {
          return match;
        }
        return match.replace(p.from, p.to);
      });
    }
  }

  return updatedContent;
}
