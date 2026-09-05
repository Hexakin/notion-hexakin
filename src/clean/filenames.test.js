import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanFilename, NOTION_ID_REGEX, resolveFilename } from './filenames.js';

test('regex captures a 32-char Notion id after a space', () => {
  const name = 'Workshop Notes a1b2c3d4e5f6789012345678abcdef01.md';
  const match = name.match(NOTION_ID_REGEX);
  assert.ok(match);
  assert.equal(match[1], 'Workshop Notes');
  assert.equal(match[2], 'a1b2c3d4e5f6789012345678abcdef01');
  assert.equal(match[4], '.md');
});

test('strips a space-separated Notion id', () => {
  assert.equal(
    cleanFilename('Workshop Notes a1b2c3d4e5f6789012345678abcdef01.md'),
    'Workshop Notes.md'
  );
});

test('strips an underscore-prefixed Notion id', () => {
  assert.equal(
    cleanFilename('Notes_abcdefabcdefabcdefabcdefabcdefab.md'),
    'Notes.md'
  );
});

test('drops the _all suffix used on CSV dumps', () => {
  assert.equal(
    cleanFilename('Tasks 11111111111111111111111111111111_all.csv'),
    'Tasks.csv'
  );
});

test('keeps an extra suffix that is not _all', () => {
  assert.equal(
    cleanFilename('Page abcdefabcdefabcdefabcdefabcdefab (1).md'),
    'Page (1).md'
  );
});

test('leaves a name without a 32-char id unchanged', () => {
  assert.equal(cleanFilename('readme.md'), 'readme.md');
});

test('resolveFilename suffixes (2) on the first collision', () => {
  const used = new Set();
  const first = resolveFilename('Notes.md', used);
  assert.deepEqual(first, { finalPath: 'Notes.md', isDuplicate: false });
  const second = resolveFilename('Notes.md', used);
  assert.deepEqual(second, { finalPath: 'Notes (2).md', isDuplicate: true });
  const third = resolveFilename('Notes.md', used);
  assert.deepEqual(third, { finalPath: 'Notes (3).md', isDuplicate: true });
});
