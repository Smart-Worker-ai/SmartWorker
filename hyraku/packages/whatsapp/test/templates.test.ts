import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TEMPLATES, placeholderCount } from '../src/templates.js';

// Meta approves a template per language and rejects any send whose parameter
// count does not match. A Malayalam body that drifted a placeholder is not a
// typo — it is a message that never reaches a worker, discovered in production.

test('every template declares as many params as its English body uses', () => {
  for (const t of TEMPLATES) {
    assert.equal(
      placeholderCount(t.body.en),
      t.params.length,
      `${t.name}: en body uses ${placeholderCount(t.body.en)} placeholders, params declares ${t.params.length}`
    );
  }
});

test('the Malayalam body uses the same placeholders as the English one', () => {
  for (const t of TEMPLATES) {
    assert.equal(
      placeholderCount(t.body.ml),
      t.params.length,
      `${t.name}: ml body uses ${placeholderCount(t.body.ml)} placeholders, params declares ${t.params.length}`
    );
  }
});

test('template names are unique', () => {
  const names = TEMPLATES.map((t) => t.name);
  assert.equal(new Set(names).size, names.length);
});

test('no template quotes a rate in its body', () => {
  // Rates are per worker and set by Hyraku, so they arrive as a parameter that
  // the caller resolves. A figure baked into an approved body cannot be changed
  // without Meta re-approving it.
  for (const t of TEMPLATES) {
    for (const lang of ['en', 'ml'] as const) {
      assert.ok(
        !/₹\s?\d/.test(t.body[lang]),
        `${t.name} (${lang}) has a literal rupee amount in the body`
      );
    }
  }
});
