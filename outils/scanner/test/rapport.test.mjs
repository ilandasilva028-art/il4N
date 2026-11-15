import { test } from 'node:test';
import assert from 'node:assert/strict';
import { echapper, formaterCritere, genererRapport } from '../lib/rapport.mjs';

test('critères WCAG', () => {
  assert.equal(formaterCritere('wcag111'), 'WCAG 1.1.1');
  assert.equal(formaterCritere('wcag1412'), 'WCAG 1.4.12');
});

test('échappement du HTML', () => {
  assert.equal(echapper('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
  const html = genererRapport({
    site: 'https://exemple.ca/', date: '2026-11-15', pages: ['https://exemple.ca/'], erreurs: [],
    a11y: null,
    langue: { textes: [{ texte: '<img onerror=x>', langue: 'eng', type: 'texte', pages: ['https://exemple.ca/'] }], pages: [], pagesTouchees: 1 },
  });
  assert.ok(!html.includes('<img onerror=x>'));
});
