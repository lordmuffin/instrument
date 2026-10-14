#!/usr/bin/env node
// Tests for the token build. Exit 1 on any failure.
//  1. Every token the hand-built reference/instrument.css defines has the same value in the
//     generated dist/web/instrument.tokens.css, in every theme block.
//  2. The build is deterministic.
//  3. Every colour token has both a light and a dark value and parses.
//  4. The tokens file version is valid semver.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll, buildCssTokens, loadTokens, parseColor } from './build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const t = loadTokens();
let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`FAIL ${msg}`);
};

// Parse "selector { --a: b; ... }" blocks into { blockName: { var: value } }.
function blocks(css) {
  const out = {};
  const grab = (name, re) => {
    const m = css.match(re);
    if (!m) return;
    out[name] = {};
    for (const d of m[1].matchAll(/(--inst-[a-z0-9-]+)\s*:\s*([^;]+);/g)) out[name][d[1]] = d[2].trim();
  };
  grab('light', /:root,\s*\[data-theme="light"\]\s*\{([^}]*)\}/);
  grab('dark-media', /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)\s*\{([^}]*)\}/);
  grab('dark-attr', /\n\[data-theme="dark"\]\s*\{([^}]*)\}/);
  grab('fixed', /\/\* Theme-independent tokens \*\/\s*:root\s*\{([^}]*)\}/);
  return out;
}

// Normalise values so "rgba(31, 35, 40, .5)" == "rgba(31,35,40,0.50)" and "0" == "0px".
function norm(v) {
  v = v.replace(/\s+/g, '').toLowerCase();
  v = v.replace(/(^|[^\d])\.(\d)/g, '$10.$2');
  v = v.replace(/(\d+\.\d*?)0+(?=\D|$)/g, '$1').replace(/\.(?=\D|$)/g, '');
  if (v === '0px') v = '0';
  return v;
}

// 1. reference parity
const ref = blocks(fs.readFileSync(path.join(ROOT, 'reference', 'instrument.css'), 'utf8'));
const gen = blocks(buildCssTokens(t));
let compared = 0;
for (const [name, vars] of Object.entries(ref)) {
  if (!gen[name]) {
    fail(`generated CSS has no "${name}" block`);
    continue;
  }
  for (const [k, v] of Object.entries(vars)) {
    compared++;
    if (!(k in gen[name])) fail(`${name}: ${k} is in reference/instrument.css but not generated`);
    else if (norm(gen[name][k]) !== norm(v)) fail(`${name}: ${k} reference "${v}" ≠ generated "${gen[name][k]}"`);
  }
}
console.log(`reference parity: ${compared} values compared`);

// 2. determinism
const a = JSON.stringify(buildAll(t));
const b = JSON.stringify(buildAll(t));
if (a !== b) fail('build is not deterministic');

// 3. colour completeness
for (const [n, v] of Object.entries(t.color)) {
  for (const theme of ['light', 'dark']) {
    if (!v[theme]) fail(`color.${n} has no ${theme} value`);
    else
      try {
        parseColor(v[theme]);
      } catch (e) {
        fail(`color.${n}.${theme}: ${e.message}`);
      }
  }
}

// 4. version
if (!/^\d+\.\d+\.\d+$/.test(t.version)) fail(`version "${t.version}" is not semver`);

if (failures) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log('all tests passed');
