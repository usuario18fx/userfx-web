import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signVoter, verifyVoter } from '../lib/fx-rating.js';
import { MESSAGE_TEMPLATES } from '../lib/message-templates.js';
test('signed personal links reject tampering, expiry and another secret', () => {
  const token = signVoter('123456789', 'secret', 1000000);
  assert.ok(verifyVoter(token, 'secret', 1000000));
  assert.equal(verifyVoter(token + 'x', 'secret', 1000000), null);
  assert.equal(verifyVoter(token, 'wrong', 1000000), null);
  assert.equal(verifyVoter(token, 'secret', 1000000 + 2592000001), null);
  assert.equal(verifyVoter('broken', 'secret'), null);
});
test('same contact retains the same voter identity across new links', () => {
  assert.equal(verifyVoter(signVoter('123456789', 'secret', 1000000), 'secret', 1000000), verifyVoter(signVoter('123456789', 'secret', 2000000), 'secret', 2000000));
});
test('exactly six distinct nonempty templates', () => {
  assert.equal(MESSAGE_TEMPLATES.length, 6);
  assert.equal(new Set(MESSAGE_TEMPLATES.map(t => t.text)).size, 6);
});
