import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { LANDMARKS } from '../src/data.js';

const manifest = JSON.parse(readFileSync(new URL('../scripts/package-manifest.json', import.meta.url)));
const dir = new URL('../public/models/tripo/', import.meta.url);

test('every web GLB is byte-identical to the package (models reused, not regenerated)', () => {
  const web = manifest.models.filter(m => m.version === 'web');
  assert.equal(web.length, 29);
  for (const m of web) {
    const file = m.path.split('/').pop();
    const sha = createHash('sha256').update(readFileSync(new URL(file, dir))).digest('hex');
    assert.equal(sha, m.sha256, file);
  }
  assert.equal(readdirSync(dir).filter(f => f.endsWith('.glb')).length, 29);
});

test('each landmark has base and high-detail models', () => {
  const files = new Set(readdirSync(dir));
  assert.ok(LANDMARKS.length >= 10);
  for (const l of LANDMARKS) {
    assert.ok(files.has(l.model + '.glb'), l.model);
    assert.ok(files.has(l.hd + '.glb'), l.hd);
  }
  for (const id of ['emperor', 'scholar', 'survivor', 'director', 'drama_lead', 'designer', 'phone_steward', 'programmer', 'curator', 'wizard', 'racer'])
    assert.ok(LANDMARKS.some(l => l.id === id), id);
});

test('phone and desktop share the current app, including legacy mobile links', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /location\.replace/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /src="\/src\/main\.js"/);
  const mobile = readFileSync(new URL('../public/mobile/index.html', import.meta.url), 'utf8');
  assert.match(mobile, /location\.replace\('\/' \+ location\.search \+ location\.hash\)/);
  assert.doesNotMatch(mobile, /assets\//);
});
