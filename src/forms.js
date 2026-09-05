export const FORM_INBOX = 'hillymakes@gmail.com';
export const FORM_ENDPOINT = `https://formsubmit.co/ajax/${FORM_INBOX}`;

/** @typedef {'idle' | 'sending' | 'sent' | 'error'} FormState */
/** @typedef {'submit' | 'ok' | 'fail'} FormEvent */

/** @type {Readonly<Record<FormState, Readonly<Partial<Record<FormEvent, FormState>>>>>} */
const TRANSITIONS = Object.freeze({
  idle: Object.freeze({ submit: 'sending' }),
  sending: Object.freeze({ ok: 'sent', fail: 'error' }),
  sent: Object.freeze({}),
  error: Object.freeze({ submit: 'sending' }),
});

/**
 * @param {FormState} state
 * @param {FormEvent} event
 * @returns {FormState}
 */
export function formStep(state, event) {
  return TRANSITIONS[state][event] ?? state;
}

// First submission to a new address needs a confirmation click.
/**
 * @param {Record<string, string>} fields
 * @returns {Promise<void>}
 */
export async function submitForm(fields) {
  const response = await fetch(FORM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      _captcha: 'false',
      _template: 'table',
      ...fields,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Form endpoint returned ${response.status}`);
  let body;
  try {
    body = await response.json();
  } catch {
    return;
  }
  if (body && (body.success === 'false' || body.success === false)) {
    throw new Error(body.message || 'FormSubmit did not confirm delivery');
  }
}
