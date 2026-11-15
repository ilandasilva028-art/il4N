import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyserRobots, cheminAutorise } from '../lib/robots.mjs';

const robots = `
User-agent: Googlebot
Disallow: /

User-agent: *
Disallow: /admin
Disallow: /*.pdf$
Allow: /admin/public
`;

test('règles du groupe *', () => {
  const r = analyserRobots(robots);
  assert.equal(cheminAutorise(r, '/'), true);
  assert.equal(cheminAutorise(r, '/admin/x'), false);
  assert.equal(cheminAutorise(r, '/admin/public/a'), true);
  assert.equal(cheminAutorise(r, '/doc.pdf'), false);
  assert.equal(cheminAutorise(r, '/doc.pdf?x'), true);
});
