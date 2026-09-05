import { FORM_INBOX, formStep, submitForm } from './forms.js';

const SUBJECT = 'Hexakin newsletter: Notion Export Cleaner';

/**
 * @param {HTMLElement} root
 * @returns {void}
 */
export function mountNewsletter(root) {
  const form = root.querySelector('form');
  const emailInput = form.querySelector('input[name="email"]');
  const button = form.querySelector('button[type="submit"]');
  const sentEl = root.querySelector('[data-newsletter="sent"]');
  const errorEl = root.querySelector('[data-newsletter="error"]');

  let state = 'idle';

  errorEl.querySelector('a').href =
    `mailto:${FORM_INBOX}?subject=${encodeURIComponent(SUBJECT)}`;

  function dispatch(event) {
    const next = formStep(state, event);
    if (next === state) return;
    state = next;
    render();
    if (next === 'sending') send();
    if (next === 'sent') form.reset();
  }

  function render() {
    form.hidden = state === 'sent';
    button.disabled = state === 'sending';
    button.textContent = state === 'sending' ? 'Sending…' : 'Subscribe';
    sentEl.hidden = state !== 'sent';
    errorEl.hidden = state !== 'error';
  }

  async function send() {
    const email = emailInput.value;
    try {
      await submitForm({
        _subject: SUBJECT,
        _replyto: email,
        email,
        source: 'notion.hexakin.com',
      });
    } catch {
      dispatch('fail');
      return;
    }
    dispatch('ok');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    dispatch('submit');
  });

  render();
}
