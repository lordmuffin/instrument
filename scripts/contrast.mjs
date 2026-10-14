#!/usr/bin/env node
// WCAG 2.x contrast check for every Instrument foreground/background pair that carries meaning.
// Fails (exit 1) if any pair is below its minimum in either theme.
//   text   ≥ 4.5:1   (body text, labels, badge text)
//   ui     ≥ 3:1     (control outlines, state glyphs on large/bold text, chart marks)

import fs from 'node:fs';
import { loadTokens, parseColor } from './build.mjs';

const KNOWN = JSON.parse(fs.readFileSync(new URL('./contrast-known.json', import.meta.url), 'utf8')).known;
const isKnown = (theme, fg, bg) => KNOWN.find((k) => k.theme === theme && k.fg === fg && k.bg === bg);

const t = loadTokens();

function luminance(hex) {
  const { r, g, b } = parseColor(hex);
  const lin = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const TEXT = 4.5;
const UI = 3;

// [foreground, background, minimum, why]
const pairs = [];
for (const bg of ['bg', 'surface', 'surface-2']) {
  pairs.push(['text', bg, TEXT, 'primary text']);
  pairs.push(['text-2', bg, TEXT, 'labels and meta']);
  pairs.push(['accent', bg, TEXT, 'links and accent text']);
  pairs.push(['them-text', bg, TEXT, 'second speaker label']);
  for (const s of ['success', 'warning', 'error']) pairs.push([s, bg, TEXT, `${s} word or glyph`]);
}
for (const bg of ['surface']) {
  pairs.push(['control', bg, UI, 'field and button outlines']);
  for (const c of t.chart['series-order']) pairs.push([c, bg, UI, 'chart marks']);
}
pairs.push(['on-accent', 'accent', TEXT, 'primary button text']);
pairs.push(['on-error', 'error', TEXT, 'destructive button text']);
pairs.push(['on-them', 'them', TEXT, 'text on second-speaker fill']);
pairs.push(['on-inverse', 'inverse', TEXT, 'toast and tooltip text']);
pairs.push(['accent-on-inverse', 'inverse', TEXT, 'links and ✓ on toasts']);
pairs.push(['text', 'accent-tint', TEXT, 'text on selected or saved row']);
pairs.push(['success', 'success-tint', TEXT, 'success banner']);
pairs.push(['warning', 'warning-tint', TEXT, 'warning banner']);
pairs.push(['error', 'error-tint', TEXT, 'error banner']);
pairs.push(['text', 'error-tint', TEXT, 'text in failed row']);

const rows = [];
let failures = 0;
for (const theme of ['light', 'dark']) {
  for (const [fg, bg, min, why] of pairs) {
    const r = ratio(t.color[fg][theme], t.color[bg][theme]);
    const ok = r >= min;
    const known = !ok && isKnown(theme, fg, bg);
    if (!ok && !known) failures++;
    if (ok && isKnown(theme, fg, bg)) console.warn(`note: ${theme} ${fg} on ${bg} now passes; remove it from scripts/contrast-known.json`);
    rows.push({ theme, fg, bg, r, min, ok, known, why });
  }
}
// Channel badges are theme-independent.
for (const ch of ['live', 'lab', 'other']) {
  const r = ratio(t.channel.on.value, t.channel[ch].value);
  const ok = r >= TEXT;
  if (!ok) failures++;
  rows.push({ theme: 'fixed', fg: 'channel.on', bg: `channel.${ch}`, r, min: TEXT, ok, why: `${ch.toUpperCase()} badge text` });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('theme', 7)}${pad('foreground', 20)}${pad('background', 16)}${pad('ratio', 8)}${pad('min', 5)}result`);
for (const x of rows) {
  console.log(`${pad(x.theme, 7)}${pad(x.fg, 20)}${pad(x.bg, 16)}${pad(x.r.toFixed(2), 8)}${pad(x.min, 5)}${x.ok ? 'ok' : x.known ? 'KNOWN' : 'FAIL'}  ${x.ok ? '' : x.known ? x.known.note : x.why}`);
}
const knownCount = rows.filter((x) => x.known).length;
console.log(`\n${rows.length} pairs checked, ${failures} new failure(s), ${knownCount} known issue(s) (scripts/contrast-known.json).`);
if (knownCount && process.env.GITHUB_ACTIONS) for (const x of rows.filter((r) => r.known)) console.log(`::warning title=Contrast ${x.theme} ${x.fg} on ${x.bg}::${x.r.toFixed(2)}:1 < ${x.min}:1. ${x.known.note}`);
process.exit(failures ? 1 : 0);
