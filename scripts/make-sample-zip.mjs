import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const ID_NOTES = 'a1b2c3d4e5f6789012345678abcdef01';
const ID_AGENDA = '0123456789abcdef0123456789abcdef';
const ID_TASKS = '11111111111111111111111111111111';
const ID_DUP_A = 'abcdefabcdefabcdefabcdefabcdefab';
const ID_DUP_B = 'fedcbafedcbafedcbafedcbafedcbafe';

const notesName = `Workshop Notes ${ID_NOTES}.md`;
const agendaName = `Agenda ${ID_AGENDA}.md`;
const tasksName = `Tasks ${ID_TASKS}.csv`;
const dupA = `Notes ${ID_DUP_A}.md`;
const dupB = `Notes_${ID_DUP_B}.md`;

const inner = new JSZip();
inner.file(
  `Hexakin Workshop/${notesName}`,
  '# Workshop Notes\n\nPrep the export cleaner sample.\n'
);
inner.file(
  `Hexakin Workshop/${agendaName}`,
  `# Agenda\n\nNext: [Workshop Notes](${notesName})\n`
);
inner.file(`Hexakin Workshop/${tasksName}`, 'Task,Status\nWrite brief,Done\n');
inner.file(`Hexakin Workshop/${dupA}`, '# Notes A\n');
inner.file(`Hexakin Workshop/${dupB}`, '# Notes B\n');

const innerBuf = await inner.generateAsync({ type: 'nodebuffer' });

const outer = new JSZip();
outer.file('Export-Hexakin Workshop.zip', innerBuf);
const outerBuf = await outer.generateAsync({ type: 'nodebuffer' });

const outPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sample-notion-export.zip');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, outerBuf);
console.log(`wrote ${outPath}`);
