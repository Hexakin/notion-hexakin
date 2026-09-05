import './styles.css';
import { mountNewsletter } from './newsletter.js';

const MAX_ZIP_SIZE = 200 * 1024 * 1024;

const landing = document.getElementById('landing');
const panel = document.getElementById('panel');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const dropHint = document.getElementById('drop-actions');
const facts = document.getElementById('facts');
const processingEl = document.getElementById('processing');
const processingStatus = document.getElementById('processing-status');
const progressBar = document.getElementById('progress-bar');
const resultEl = document.getElementById('result');
const resultCounts = document.getElementById('result-counts');
const resultNested = document.getElementById('result-nested');
const resultDuplicates = document.getElementById('result-duplicates');
const renamePreview = document.getElementById('rename-preview');
const errorEl = document.getElementById('error');
const errorMessage = document.getElementById('error-message');
const newsletterEl = document.getElementById('newsletter');

let state = { phase: 'landing' };
let worker = null;

function setState(next) {
  state = next;
  render(state);
}

function render(s) {
  landing.hidden = s.phase !== 'landing';
  panel.hidden = s.phase === 'landing';
  dropzone.hidden = s.phase !== 'tool';
  dropHint.hidden = s.phase !== 'tool';
  facts.hidden = s.phase !== 'tool';
  processingEl.hidden = s.phase !== 'processing';
  resultEl.hidden = s.phase !== 'result';
  errorEl.hidden = s.phase !== 'error';
  newsletterEl.hidden = s.phase !== 'result';

  if (s.phase === 'processing') {
    processingStatus.textContent = s.status;
    progressBar.style.width = `${s.percent}%`;
  }

  if (s.phase === 'result') {
    fillResult(s.result.stats);
  }

  if (s.phase === 'error') {
    errorMessage.textContent = s.message;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function fillResult(stats) {
  resultCounts.innerHTML = `
    <div><dt>files</dt><dd>${stats.totalFiles}</dd></div>
    <div><dt>renamed</dt><dd>${stats.fileRenamesCount}</dd></div>
    <div><dt>links</dt><dd>${stats.linksUpdatedCount}</dd></div>
    <div><dt>skipped</dt><dd>${stats.skippedLargeFiles}</dd></div>
  `;

  if (stats.nestedZipName) {
    resultNested.hidden = false;
    resultNested.textContent = `Unwrapped ${stats.nestedZipName}`;
  } else {
    resultNested.hidden = true;
    resultNested.textContent = '';
  }

  if (stats.duplicates.length) {
    resultDuplicates.hidden = false;
    resultDuplicates.innerHTML = stats.duplicates
      .slice(0, 8)
      .map((d) => `<li>${escapeHtml(d)}</li>`)
      .join('');
  } else {
    resultDuplicates.hidden = true;
    resultDuplicates.innerHTML = '';
  }

  if (stats.sampleRenames.length) {
    renamePreview.innerHTML = stats.sampleRenames
      .map(
        (r) =>
          `<div class="rename-row"><span class="old">${escapeHtml(r.oldName)}</span><span class="arrow" aria-hidden="true">→</span><span class="new">${escapeHtml(r.newName)}</span></div>`
      )
      .join('');
  } else {
    renamePreview.innerHTML = '<p class="mute">No files needed renaming.</p>';
  }
}

function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

function patchProcessing(partial) {
  if (state.phase !== 'processing') return;
  setState({ ...state, ...partial });
}

async function processZip(file) {
  if (file.size > MAX_ZIP_SIZE) {
    setState({
      phase: 'error',
      message: `ZIP file is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_ZIP_SIZE / 1024 / 1024} MB.`,
    });
    return;
  }

  terminateWorker();
  setState({ phase: 'processing', status: 'Step 1 of 4: Reading ZIP...', percent: 10 });

  const arrayBuffer = await file.arrayBuffer();
  if (state.phase !== 'processing') return;
  patchProcessing({ percent: 20 });

  worker = new Worker(new URL('./clean/worker.js', import.meta.url), { type: 'module' });

  worker.onmessage = (e) => {
    const { type } = e.data;
    if (type === 'progress') {
      patchProcessing({ percent: e.data.percent });
    } else if (type === 'status') {
      patchProcessing({ status: e.data.message });
    } else if (type === 'complete') {
      const raw = e.data.result;
      const blob = new Blob([raw.cleanZipBuffer], { type: 'application/zip' });
      const stats = {
        totalFiles: raw.totalFiles,
        fileRenamesCount: raw.fileRenamesCount,
        linksUpdatedCount: raw.linksUpdatedCount,
        duplicates: raw.duplicates,
        skippedLargeFiles: raw.skippedLargeFiles,
        nestedZipName: raw.nestedZipName,
        sampleRenames: raw.sampleRenames,
      };
      terminateWorker();
      setState({ phase: 'result', result: { blob, stats } });
    } else if (type === 'error') {
      terminateWorker();
      setState({ phase: 'error', message: e.data.message });
    }
  };

  worker.onerror = (err) => {
    terminateWorker();
    setState({
      phase: 'error',
      message: err.message || 'Worker failed unexpectedly',
    });
  };

  worker.postMessage({ type: 'process', arrayBuffer }, [arrayBuffer]);
}

async function trySample() {
  setState({ phase: 'processing', status: 'Loading sample...', percent: 5 });
  try {
    const res = await fetch('/sample-notion-export.zip');
    if (!res.ok) {
      setState({ phase: 'error', message: 'Could not load the sample export.' });
      return;
    }
    const blob = await res.blob();
    const file = new File([blob], 'sample-notion-export.zip', { type: 'application/zip' });
    await processZip(file);
  } catch {
    setState({ phase: 'error', message: 'Could not load the sample export.' });
  }
}

function downloadCleanZip() {
  if (state.phase !== 'result') return;
  const url = URL.createObjectURL(state.result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clean_notion_export.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function acceptZip(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.zip')) {
    setState({ phase: 'error', message: 'Please drop a ZIP file.' });
    return;
  }
  processZip(file);
}

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.getAttribute('data-action');
  if (action === 'goto-landing') {
    e.preventDefault();
    terminateWorker();
    setState({ phase: 'landing' });
    window.scrollTo(0, 0);
  } else if (action === 'goto-tool') {
    setState({ phase: 'tool' });
    panel.scrollIntoView({ block: 'start' });
  } else if (action === 'try-sample') {
    trySample();
  } else if (action === 'download') {
    downloadCleanZip();
  } else if (action === 'clean-another') {
    terminateWorker();
    fileInput.value = '';
    setState({ phase: 'tool' });
  }
});

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  acceptZip(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', () => {
  acceptZip(fileInput.files[0]);
});

mountNewsletter(newsletterEl);
render(state);
