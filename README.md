# Blog

A personal blog built with [Astro](https://astro.build), deployed on Vercel.
Posts are Markdown files; everything else is static.

- **Writing a post →** [WRITING.md](./WRITING.md)
- **Secrets and hardening →** [SECURITY.md](./SECURITY.md)

---

## Quick start

```bash
npm install       # once
npm run dev       # http://localhost:4321
```

That is the whole loop. Edit a file under `src/content/blog/`, save, and the
browser updates.

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload. Drafts are visible here. |
| `npm run new` | Scaffold a new post (asks for title, topic, tags). |
| `npm run build` | Production build into `dist/`, then builds the search index. |
| `npm run preview` | Serve `dist/` locally — the closest thing to production. |
| `npm run check` | Type-check the whole project. |
| `npm run check:csp` | Fail if the build contains anything the CSP blocks. |
| `npm run og` | Regenerate the default social-share image. |

Search only works after `npm run build`, because the index is generated from
the built HTML. Use `npm run build && npm run preview` to try it locally.

---

## Deploying to Vercel

You only do this once.

1. Push this repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new), import the repository.
   Vercel detects Astro automatically — accept every default.
3. Click **Deploy**.

Every push to `main` now deploys to production, and every pull request gets its
own preview URL. Nothing else is required for the site itself to work.

### After the first deploy

- **Set `SITE_URL`** (Project → Settings → Environment Variables) once you have
  a custom domain, so canonical links, RSS and social cards point at the right
  place. Until then Vercel's own URL is used automatically.
- **Enable the newsletter** by setting `BUTTONDOWN_API_KEY` — see below.
- **Enable comments** by filling in `COMMENTS` in `src/consts.ts` — see below.

---

## Configuring the site

Almost everything you will want to change lives in **`src/consts.ts`**:

| What | Where |
| --- | --- |
| Site title, description, author | `SITE` |
| Header navigation | `NAV` |
| Footer links (GitHub, email, RSS) | `SOCIALS` |
| Topics, their blurbs and accent colours | `TOPICS` |
| Comments on/off and giscus IDs | `COMMENTS` |
| Newsletter on/off and its copy | `NEWSLETTER` |
| How many related posts to show | `RELATED_POST_COUNT` |

Colours, type and spacing live in **`src/styles/global.css`**, at the top, as
CSS custom properties. Changing `--accent` there re-themes the entire site.

The About page is a plain page at `src/pages/about.astro` — edit the prose
directly.

---

## Turning on comments (giscus)

Comments are backed by GitHub Discussions, so there is no database and no
account to manage. Readers sign in with GitHub.

1. Make sure this repository is **public** and Discussions are enabled
   (Settings → General → Features → Discussions).
2. Install the [giscus GitHub app](https://github.com/apps/giscus) on the
   repository.
3. Go to [giscus.app](https://giscus.app), enter your repo, and choose
   **Discussion title contains page pathname** as the mapping.
4. It will show you a `data-repo-id` and `data-category-id`. Copy those into
   `COMMENTS` in `src/consts.ts` and set `enabled: true`.

None of those values are secret — giscus is configured entirely in the browser.

---

## Turning on the newsletter (Buttondown)

1. Create an account at [buttondown.com](https://buttondown.com) — the free
   tier covers the first 100 subscribers.
2. Copy your API key from Settings → Programming.
3. In Vercel: Project → Settings → Environment Variables → add
   `BUTTONDOWN_API_KEY`, scoped to Production and Preview.
4. Redeploy.

The key is only ever read by `api/subscribe.js`, which runs on Vercel's
servers. It is never bundled into the site and never reaches a browser. See
[SECURITY.md](./SECURITY.md).

To switch providers, that one file is the only thing to change.

If you prefer not to run a newsletter at all, set `NEWSLETTER.enabled = false`
in `src/consts.ts` and delete `api/subscribe.js`.

---

## How it is put together

```
src/
  consts.ts              Site configuration — start here
  content.config.ts      Post frontmatter schema
  content/blog/          Your posts
  components/            UI pieces
    media/               Figure, Gallery, Video, Callout
    layout/              Header, Footer
  layouts/               BaseLayout (every page), PostLayout (posts)
  lib/                   Post querying, related-post scoring, client helpers
  pages/                 One file per route
  styles/global.css      Design tokens and prose styles
api/subscribe.js         Newsletter endpoint (runs on Vercel, holds the key)
scripts/                 new-post, social image, sample artwork
public/                  Files served as-is
vercel.json              Security headers
```

### Routes

| URL | Source |
| --- | --- |
| `/` | `src/pages/index.astro` |
| `/posts/` | `src/pages/posts/index.astro` |
| `/posts/<slug>/` | `src/pages/posts/[...slug].astro` |
| `/topics/`, `/topics/<topic>/` | `src/pages/topics/` |
| `/tags/<tag>/` | `src/pages/tags/[tag].astro` |
| `/search` | `src/pages/search.astro` |
| `/about` | `src/pages/about.astro` |
| `/rss.xml` | `src/pages/rss.xml.ts` |
| `/sitemap-index.xml` | generated at build |

---

## What is included

Reading experience
- Light and dark themes, remembered per reader, no flash on load
- Sticky table of contents on posts with three or more headings
- Reading time, related posts, topic and tag browsing
- Client-side full-text search (Pagefind) — no server, no third party
- Smooth cross-page transitions and link prefetching

Writing
- Markdown and MDX, with `Figure`, `Gallery`, `Video` and `Callout` available
  in every post without importing them
- Images optimised at build time; put them next to the post
- Syntax highlighting in both themes, LaTeX maths via KaTeX
- Drafts that are visible locally and never published

Distribution
- RSS feed, sitemap, canonical URLs, Open Graph and Twitter cards
- Optional comments and newsletter

Security
- Strict Content Security Policy and a full set of security headers
- Vercel Web Analytics (privacy-friendly, cookieless, served same-origin)
- No third-party fonts, no tag manager, no CDN scripts
- Video embeds are click-to-load, so nothing reaches YouTube unprompted

---

## Sample content

Four sample posts ship with this repository so the design has something to
show. They are safe to delete once you have your own:

```bash
rm -rf src/content/blog/raft-consensus \
       src/content/blog/amortized-analysis \
       src/content/blog/attention-from-scratch \
       src/content/blog/reading-notes-p-vs-np \
       scripts/make-sample-art.mjs
```

`src/content/blog/component-reference/` is a permanent draft showing every
media component. It never appears on the live site. Keep it as a reference or
delete it too.
