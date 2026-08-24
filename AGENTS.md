# Project notes

A personal blog built with Astro 7. Human-facing docs: [README.md](./README.md),
[WRITING.md](./WRITING.md), [SECURITY.md](./SECURITY.md).

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage it with `astro dev stop`, `astro dev status`, and `astro dev logs`.

Verify a change with `npm run build` (which also rebuilds the search index) and
`npm run check` for types. `npm run preview` serves the built site.

## Conventions specific to this project

**No inline scripts.** `vercel.json` sets `script-src 'self'`, so an inline
`<script>` is blocked in production while still working locally — a silent
failure. Astro inlines a component script that has no imports, so every
component `<script>` must import from `src/lib/client.ts` (`onReady`, `claim`).
After touching client JS, confirm with:

```
npm run build && grep -rn '<script type="module">' dist/   # must print nothing
```

**Secrets never live under `src/`.** Everything there ships to the browser, and
Astro exposes any `PUBLIC_*` variable by design. Server-only values are read in
`api/subscribe.js` from `process.env`.

**Dates are handled in UTC.** `pubDate: 2026-01-01` parses to midnight UTC;
formatting in local time renders the previous day west of Greenwich. Use
`timeZone: 'UTC'` and `getUTCFullYear()`.

**Astro 7 specifics.** The default Markdown processor (Sätteri) does not run
remark/rehype plugins, so `astro.config.mjs` sets
`processor: unified({ ... })` from `@astrojs/markdown-remark` for KaTeX and
heading anchors. Astro's built-in `security.csp` is not usable here: it is
incompatible with `<ClientRouter />` and with Shiki.

**Adding a topic** means adding an entry to `TOPICS` in `src/consts.ts`. The
schema enum, the topic pages and the accent colour all derive from it.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
