// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';

/**
 * Canonical site URL.
 *
 * Resolution order:
 *   1. SITE_URL            - set this in Vercel once you have a custom domain.
 *   2. VERCEL_PROJECT_PRODUCTION_URL - injected by Vercel automatically.
 *   3. localhost fallback  - used during local development.
 *
 * Only the production URL matters for canonical links, RSS, sitemap and
 * social-share cards, so this never needs to be a secret.
 */
const site =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:4321');

export default defineConfig({
  site,

  markdown: {
    // Astro 7 defaults to the Sätteri processor, which does not run
    // remark/rehype plugins. KaTeX math needs the unified pipeline.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        [rehypeKatex, { output: 'html', throwOnError: false }],
        // rehype-slug runs first so every heading has an id for autolink to
        // hang a quiet "#" off, letting sections be linked to directly.
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'prepend',
            properties: { className: ['heading-anchor'], ariaHidden: 'true', tabIndex: -1 },
            content: { type: 'text', value: '#' },
          },
        ],
      ],
    }),
    // Dual-theme code blocks; global.css swaps the CSS variables Shiki emits.
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      wrap: true,
    },
  },

  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/404') })],

  // Warm up links the reader is about to click. No extra JS to write.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },

  image: {
    // Only these remote hosts may be optimised at build time. Keeping this
    // list closed stops a stray markdown URL turning the build into an
    // open image proxy.
    domains: ['images.unsplash.com'],
  },
});
