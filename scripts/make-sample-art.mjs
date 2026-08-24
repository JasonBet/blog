#!/usr/bin/env node
/**
 * Generates the abstract artwork used by the sample posts.
 *
 *   node scripts/make-sample-art.mjs
 *
 * Everything is drawn procedurally in the site's palette, so there are no
 * stock photos to license and no external requests. Once you have replaced
 * the sample posts with your own, you can delete this script and the images
 * it produced.
 */
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const PAPER = '#F2F0EA';
const INK = '#1A1A1A';

/** Deterministic PRNG so re-running produces byte-identical images. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Concentric arcs radiating from one corner — used for cover images. */
function arcs({ w, h, accent, seed, count = 26 }) {
  const rand = rng(seed);
  const cx = w * 0.14;
  const cy = h * 1.02;
  const max = Math.hypot(w - cx, cy);

  let out = '';
  for (let i = count; i > 0; i--) {
    const r = (max / count) * i;
    const opacity = (0.10 + rand() * 0.16).toFixed(3);
    const width = (0.8 + rand() * 2.4).toFixed(2);
    out += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${accent}" stroke-opacity="${opacity}" stroke-width="${width}"/>`;
  }
  return out;
}

/** A field of dots whose size drifts across the canvas. */
function dotField({ w, h, accent, seed, step = 34 }) {
  const rand = rng(seed);
  let out = '';
  for (let y = step; y < h; y += step) {
    for (let x = step; x < w; x += step) {
      const t = x / w;
      const r = (1.4 + t * 5.2 * rand()).toFixed(2);
      const opacity = (0.12 + t * 0.62 * rand()).toFixed(3);
      out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${accent}" fill-opacity="${opacity}"/>`;
    }
  }
  return out;
}

/** Diagonal hatching with varying density. */
function hatch({ w, h, accent, seed, gap = 15 }) {
  const rand = rng(seed);
  let out = '';
  for (let x = -h; x < w; x += gap) {
    const opacity = (0.07 + rand() * 0.24).toFixed(3);
    const width = (0.5 + rand() * 1.3).toFixed(2);
    out += `<line x1="${x}" y1="0" x2="${x + h}" y2="${h}" stroke="${accent}" stroke-opacity="${opacity}" stroke-width="${width}"/>`;
  }
  return out;
}

/** A stepped "log" of blocks — reads as replicated entries. */
function blocks({ w, h, accent, seed, rows = 4, cols = 9 }) {
  const rand = rng(seed);
  const padX = w * 0.09;
  const padY = h * 0.16;
  const cw = (w - padX * 2) / cols;
  const ch = (h - padY * 2) / rows;

  let out = '';
  for (let r = 0; r < rows; r++) {
    const committed = Math.max(2, Math.round(cols - r * 1.7 - rand()));
    for (let c = 0; c < cols; c++) {
      const filled = c < committed;
      const x = padX + c * cw + cw * 0.09;
      const y = padY + r * ch + ch * 0.16;
      const bw = cw * 0.82;
      const bh = ch * 0.68;
      out += filled
        ? `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="4" fill="${accent}" fill-opacity="${(0.55 - r * 0.1).toFixed(2)}"/>`
        : `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="4" fill="none" stroke="${accent}" stroke-opacity="0.22" stroke-dasharray="4 4"/>`;
    }
  }
  return out;
}

/** An attention-style heat grid. */
function heatGrid({ w, h, accent, seed, n = 12 }) {
  const rand = rng(seed);
  const pad = Math.min(w, h) * 0.1;
  const size = Math.min(w, h) - pad * 2;
  const cell = size / n;
  const ox = (w - size) / 2;
  const oy = (h - size) / 2;

  let out = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      // Weight toward the diagonal, the way a trained attention map looks.
      const near = Math.exp(-Math.pow((r - c) / 2.6, 2));
      const v = Math.min(1, near * (0.55 + rand() * 0.75));
      out += `<rect x="${(ox + c * cell).toFixed(1)}" y="${(oy + r * cell).toFixed(1)}" width="${(cell - 1.5).toFixed(1)}" height="${(cell - 1.5).toFixed(1)}" rx="2" fill="${accent}" fill-opacity="${v.toFixed(3)}"/>`;
    }
  }
  return out;
}

/** A growing-array curve: doublings shown as steps under a smooth line. */
function amortized({ w, h, accent, seed }) {
  const rand = rng(seed);
  const padX = w * 0.1;
  const padY = h * 0.16;
  const iw = w - padX * 2;
  const ih = h - padY * 2;

  let steps = '';
  let cap = 1;
  let i = 0;
  while (cap < 64) {
    const x = padX + (Math.log2(cap) / 6) * iw;
    const nextCap = cap * 2;
    const nx = padX + (Math.log2(nextCap) / 6) * iw;
    const y = padY + ih - (Math.log2(cap + 1) / 6.5) * ih;
    steps += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(nx - x - 3).toFixed(1)}" height="${(padY + ih - y).toFixed(1)}" fill="${accent}" fill-opacity="${(0.1 + i * 0.045).toFixed(3)}"/>`;
    cap = nextCap;
    i++;
  }

  let line = `M ${padX} ${padY + ih}`;
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const x = padX + t * iw;
    const y = padY + ih - (t * 0.82 + rand() * 0.012) * ih;
    line += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }

  return `${steps}<path d="${line}" fill="none" stroke="${accent}" stroke-opacity="0.75" stroke-width="2.5" stroke-linecap="round"/>`;
}

function canvas(w, h, body, { bg = PAPER, border = false, accent = '#B5654A' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="wash" cx="88%" cy="12%" r="82%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/>
      <stop offset="55%" stop-color="${accent}" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="${bg}"/>
  <rect width="${w}" height="${h}" fill="url(#wash)"/>
  ${body}
  ${border ? `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="none" stroke="${INK}" stroke-opacity="0.07"/>` : ''}
</svg>`;
}

const ROOT = new URL('../src/content/blog/', import.meta.url);

const IMAGES = [
  {
    path: 'raft-consensus/cover.png',
    w: 1600,
    h: 900,
    svg: ({ w, h }) =>
      canvas(w, h, arcs({ w, h, accent: '#B5654A', seed: 7 }) + dotField({ w, h, accent: '#B5654A', seed: 11, step: 44 }), { accent: '#B5654A' }),
  },
  {
    path: 'raft-consensus/log-replication.png',
    w: 1400,
    h: 620,
    svg: ({ w, h }) => canvas(w, h, blocks({ w, h, accent: '#B5654A', seed: 3 }), { border: true, accent: '#B5654A' }),
  },
  {
    path: 'amortized-analysis/cover.png',
    w: 1600,
    h: 900,
    svg: ({ w, h }) => canvas(w, h, hatch({ w, h, accent: '#7A6A9B', seed: 21 }) + amortized({ w, h, accent: '#7A6A9B', seed: 5 }), { accent: '#7A6A9B' }),
  },
  {
    path: 'attention-from-scratch/cover.png',
    w: 1600,
    h: 900,
    svg: ({ w, h }) => canvas(w, h, arcs({ w, h, accent: '#4F7A6B', seed: 17, count: 18 }) + heatGrid({ w: w * 0.62, h, accent: '#4F7A6B', seed: 9, n: 14 }), { accent: '#4F7A6B' }),
  },
  {
    path: 'attention-from-scratch/head-1.png',
    w: 900,
    h: 700,
    svg: ({ w, h }) => canvas(w, h, heatGrid({ w, h, accent: '#4F7A6B', seed: 31, n: 10 }), { border: true, accent: '#4F7A6B' }),
  },
  {
    path: 'attention-from-scratch/head-2.png',
    w: 900,
    h: 700,
    svg: ({ w, h }) => canvas(w, h, heatGrid({ w, h, accent: '#4F7A6B', seed: 47, n: 10 }), { border: true, accent: '#4F7A6B' }),
  },
  {
    path: 'attention-from-scratch/head-3.png',
    w: 900,
    h: 700,
    svg: ({ w, h }) => canvas(w, h, heatGrid({ w, h, accent: '#4F7A6B', seed: 63, n: 10 }), { border: true, accent: '#4F7A6B' }),
  },
];

for (const image of IMAGES) {
  const out = fileURLToPath(new URL(image.path, ROOT));
  await mkdir(dirname(out), { recursive: true });
  await sharp(Buffer.from(image.svg(image))).png({ compressionLevel: 9 }).toFile(out);
  console.log(`  ${image.path}`);
}

console.log(`\nWrote ${IMAGES.length} images.`);
