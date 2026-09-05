import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formStep } from './forms.js';

test('submit starts sending from idle and from error', () => {
  assert.equal(formStep('idle', 'submit'), 'sending');
  assert.equal(formStep('error', 'submit'), 'sending');
});

test('a repeat submit while sending is a no-op', () => {
  assert.equal(formStep('sending', 'submit'), 'sending');
});

test('sent is terminal', () => {
  for (const event of ['submit', 'ok', 'fail']) assert.equal(formStep('sent', event), 'sent');
});

test('ok and fail only resolve sending', () => {
  assert.equal(formStep('sending', 'ok'), 'sent');
  assert.equal(formStep('sending', 'fail'), 'error');
  assert.equal(formStep('idle', 'ok'), 'idle');
  assert.equal(formStep('error', 'fail'), 'error');
});
