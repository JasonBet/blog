#!/usr/bin/env node
/**
 * Regenerate public/og-default.png — the social-share card used for pages
 * that have no cover image of their own.
 *
 *   npm run og
 *
 * The output is committed to the repository, so the build never depends on
 * this script running. Re-run it if you change the site title or palette.
 */
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Kept in step with src/consts.ts by hand — it is two strings.
const TITLE = 'Jason Betsargon';
const SUBTITLE = 'Notes from a graduate CS student';

const BG = '#FAF9F6';
const INK = '#1A1A1A';
const MUTED = '#6B6660';
const ACCENT = '#B5654A';

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="${BG}"/>

  <!-- A soft accent wash in the corner, mirroring the site's restraint. -->
  <circle cx="1140" cy="70" r="320" fill="${ACCENT}" opacity="0.06"/>

  <rect x="80" y="500" width="120" height="4" rx="2" fill="${ACCENT}"/>

  <text x="80" y="300"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="82" font-weight="600" fill="${INK}">${TITLE}</text>

  <text x="80" y="368"
        font-family="Helvetica, Arial, sans-serif"
        font-size="32" fill="${MUTED}">${SUBTITLE}</text>

  <text x="80" y="552"
        font-family="Helvetica, Arial, sans-serif"
        font-size="24" letter-spacing="3" fill="${MUTED}">SYSTEMS · ALGORITHMS · MACHINE LEARNING · THEORY</text>
</svg>`;

const out = fileURLToPath(new URL('../public/og-default.png', import.meta.url));

await sharp(Buffer.from(svg)).png().toFile(out);
console.log(`Wrote ${out}`);
