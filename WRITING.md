# Writing posts

Everything you need to publish. If you only read one section, read the first.

---

## The short version

```bash
npm run new "Notes on Raft Consensus"
npm run dev
```

That creates `src/content/blog/notes-on-raft-consensus/index.mdx`, opens a
folder for the post's images, and gives you a template to fill in. Write, save,
look at `http://localhost:4321`.

When it is ready, delete the `draft: true` line, then:

```bash
git add -A
git commit -m "post: notes on raft consensus"
git push
```

Vercel deploys it within about a minute. There is no admin panel and no
publish button — pushing to `main` *is* publishing.

---

## Where posts live

Two layouts work, and you can mix them freely:

```
src/content/blog/
  quick-thought.mdx              ->  /posts/quick-thought/
  notes-on-raft/
    index.mdx                    ->  /posts/notes-on-raft/
    cover.png                        images for this post live here
    diagram.png
```

Use a folder whenever the post has images. Use a single file when it does not.

Anything inside a folder starting with `_` is ignored completely, so
`src/content/blog/_drafts/` is a scratch area that does not even have to be
valid.

---

## Frontmatter

The block at the top of every post between `---` lines. It is validated on
every build, so a typo fails loudly rather than shipping broken.

```yaml
---
title: 'Raft, and why leader election is the easy part'
description: 'One or two sentences. Shown in listings, search and link previews.'
pubDate: 2026-08-18
topic: systems
tags: ['distributed-systems', 'consensus']
cover: ./cover.png
coverAlt: 'Concentric arcs over a field of dots'
draft: true
featured: false
updatedDate: 2026-08-24
---
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Up to 140 characters. |
| `description` | yes | Up to 300. Write it for someone deciding whether to click. |
| `pubDate` | yes | `YYYY-MM-DD`. Sorting and grouping use this. |
| `topic` | yes | Exactly one, from the list below. |
| `tags` | no | Lowercase and hyphenated. Any number. |
| `cover` | no | Path relative to the post, e.g. `./cover.png`. |
| `coverAlt` | with `cover` | Required whenever there is a cover — the build enforces it. |
| `draft` | no | `true` keeps it local-only. |
| `featured` | no | `true` pins it to the homepage hero. |
| `updatedDate` | no | Set when you meaningfully revise a published post. |

### Topics vs tags

**Topic** is the one bucket a post belongs to. It drives the coloured chip, the
`/topics/` pages, and most of the related-post scoring. The current list:

`systems` · `algorithms` · `machine-learning` · `theory`

To add one, add an entry to `TOPICS` in `src/consts.ts` — name, description and
an accent colour. The schema, the topic page and the colour all follow
automatically.

**Tags** are free-form and cross-cutting. `implementation-notes` might appear
under three different topics. Each tag gets a `/tags/<tag>/` page.

---

## Media

Four components are available in every `.mdx` post **without importing them**.
Images, though, do need an import — that is what lets Astro resize and optimise
them at build time.

### One image

```mdx
import diagram from './diagram.png';

<Figure src={diagram} alt="Describe what it shows" caption="Optional caption." />
```

Add `wide` to let it spill past the text column — good for wide diagrams:

```mdx
<Figure src={diagram} alt="…" caption="…" wide />
```

### An image with text beside it

```mdx
<Figure src={photo} alt="…" side="right">
  This text sits next to the image on a wide screen and underneath it on a
  phone. Normal markdown works here.
</Figure>
```

`side="left"` puts the text on the left and the image on the right.

### A photo gallery

```mdx
import a from './lab-1.jpg';
import b from './lab-2.jpg';
import c from './lab-3.jpg';

<Gallery
  columns={3}
  images={[
    { src: a, alt: 'Rack of test machines', caption: 'The cluster.' },
    { src: b, alt: 'Console output' },
    { src: c, alt: 'Whiteboard' },
  ]}
  caption="Optional caption for the whole gallery."
/>
```

Clicking any image opens it full-size. `columns` accepts 2, 3 or 4 and drops to
fewer on narrow screens by itself.

### Video

```mdx
<Video youtube="dQw4w9WgXcQ" title="What the video is" />
<Video vimeo="76979871" title="Lecture recording" />
<Video src="/media/demo.mp4" title="Scheduler demo" poster={shot} />
```

Embeds are click-to-load: nothing is requested from YouTube or Vimeo until a
reader presses play, and YouTube is served through `youtube-nocookie.com`. For
a self-hosted file, put the `.mp4` in `public/media/` and reference it as
`/media/name.mp4`.

### Callouts

```mdx
<Callout type="note" title="Optional title">Text goes here.</Callout>
```

Types: `note` (default), `tip`, `warning`, `definition`.

### Plain markdown images

Still work, and are still optimised:

```md
![Alt text](./diagram.png)
```

Use these when you do not need a caption.

---

## Code and maths

Fenced code blocks are highlighted automatically, in both light and dark:

````md
```python
def example(n: int) -> int:
    return n * 2
```
````

Maths uses LaTeX, inline with single dollars and display with double:

```md
The bound is $O(n \log n)$.

$$
T(n) = 2T(n/2) + \Theta(n)
$$
```

---

## Headings, links and structure

Use `##` for sections and `###` for subsections — never `#`, since the title
already provides the page's `h1`.

Every heading gets an anchor link automatically (hover it and a `#` appears),
and posts with three or more headings get a table of contents in the margin on
wide screens. Nothing to configure.

---

## Related posts

The "Keep reading" section at the bottom of each post is computed, not curated.
A candidate scores 3 for sharing the topic and 1 for each shared tag, ties
break toward the more recent post, and if nothing scores it falls back to
recent posts so the section is never empty.

The practical consequence: **tag consistently**. `distributed-systems` and
`distributed_systems` are different tags and will not link posts together.

---

## Drafts and previewing

`draft: true` means the post appears in `npm run dev` and is left out of
production builds entirely. It is not hidden — it is not there.

To preview exactly what will ship, including search:

```bash
npm run build && npm run preview
```

---

## Editing a published post

Small fixes need nothing special. For a substantive revision, add
`updatedDate: 2026-09-01` — the post then shows "Updated 1 September 2026"
under the byline.

---

## A checklist before pushing

- `description` reads well as a link preview
- `coverAlt` describes the image (required if there is a cover)
- Every `<Figure>` and `<Gallery>` image has real `alt` text
- Tags match the spelling you have used before
- `draft: true` is gone
- `npm run build` passes

---

## When something breaks

**The build fails with a frontmatter error.** The message names the file and
the field. Usually a missing `description`, a topic that is not in `TOPICS`, or
a `cover` without a `coverAlt`.

**An image will not load.** Imported images need a path relative to the post
file (`./photo.jpg`). Files in `public/` are referenced from the site root
(`/media/photo.jpg`) and are *not* optimised.

**Search finds nothing locally.** The index is built by `npm run build`. Plain
`npm run dev` has no index — that is expected.

**A post is missing from the site.** Check `draft: true`, and check the file is
not inside a folder whose name starts with `_`.
