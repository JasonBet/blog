#!/usr/bin/env node
/**
 * Scaffold a new blog post.
 *
 *   npm run new                          -> asks you for a title
 *   npm run new "Notes on Raft"          -> uses that title
 *   npm run new "Notes on Raft" systems  -> and that topic
 *
 * Creates src/content/blog/<slug>/index.mdx with valid frontmatter and a
 * folder ready for the post's images. Never overwrites an existing post.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, exit } from 'node:process';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BLOG_DIR = join(ROOT, 'src', 'content', 'blog');

/** Read the topic keys straight out of consts.ts so the two never drift. */
async function readTopics() {
  const source = await import('node:fs/promises').then((fs) =>
    fs.readFile(join(ROOT, 'src', 'consts.ts'), 'utf8'),
  );
  const block = source.match(/export const TOPICS = \{([\s\S]*?)\n\} as const;/);
  if (!block) return [];
  return [...block[1].matchAll(/^\s{2}'?([a-z0-9-]+)'?:\s*\{/gm)].map((m) => m[1]);
}

function slugify(title) {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function today() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Escape a value for a single-quoted YAML scalar. */
function yaml(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const TEMPLATE = ({ title, description, date, topic, tags }) => `---
title: ${yaml(title)}
description: ${yaml(description)}
pubDate: ${date}
topic: ${topic}
tags: [${tags.map((t) => yaml(t)).join(', ')}]
draft: true
# featured: true              # pin this post to the top of the homepage
# cover: ./cover.jpg          # drop an image in this folder and uncomment
# coverAlt: 'Describe the image for screen readers'
---

Open with a paragraph that says what this post is about and why you cared
enough to write it down. This text is what a reader sees before deciding
whether to keep going.

## The first idea

Write normally. **Bold**, *italic*, \`inline code\` and [links](https://example.com)
all work the way you expect.

\`\`\`python
def example(n: int) -> int:
    """Fenced code blocks are syntax-highlighted automatically."""
    return n * 2
\`\`\`

Inline maths like $O(n \\log n)$ works, and so does a display equation:

$$
T(n) = 2T(n/2) + \\Theta(n) = \\Theta(n \\log n)
$$

<Callout type="note" title="Aside">
  Use a callout for a definition or a warning that would otherwise interrupt
  the flow. Types: note, tip, warning, definition.
</Callout>

## Media

Import an image at the top of the file and pass it to \`<Figure>\`:

{/*
import diagram from './diagram.png';

<Figure src={diagram} alt="What the diagram shows" caption="A caption." />
*/}

You do not need to import \`Figure\`, \`Gallery\`, \`Video\` or \`Callout\` —
they are available in every post. See WRITING.md for the full reference.

## Wrapping up

End with what you would tell someone who asked "so what?" — the one sentence
worth remembering.

---

When this is ready, delete \`draft: true\` from the frontmatter above and it
will appear on the site at the next deploy.
`;

async function main() {
  const [titleArg, topicArg] = process.argv.slice(2);
  const topics = await readTopics();

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const title = titleArg ?? (await rl.question('Title: '));
    if (!title.trim()) {
      console.error('A title is required.');
      exit(1);
    }

    let topic = topicArg;
    if (!topic) {
      console.log(`\nTopics: ${topics.join(', ')}`);
      topic = (await rl.question(`Topic [${topics[0]}]: `)) || topics[0];
    }
    if (topics.length > 0 && !topics.includes(topic)) {
      console.error(
        `\n"${topic}" is not a known topic.\nEither pick one of: ${topics.join(', ')}\nor add it to TOPICS in src/consts.ts first.`,
      );
      exit(1);
    }

    const description =
      (await rl.question('One-line description (you can change this later): ')) ||
      'TODO: write a one-line description.';

    const tagsAnswer = await rl.question('Tags, comma-separated (optional): ');
    const tags = tagsAnswer
      .split(',')
      .map((t) => slugify(t))
      .filter(Boolean);

    const slug = slugify(title);
    const dir = join(BLOG_DIR, slug);
    const file = join(dir, 'index.mdx');

    if (await exists(file)) {
      console.error(`\nA post already exists at ${relative(ROOT, file)}. Nothing was written.`);
      exit(1);
    }

    await mkdir(dir, { recursive: true });
    await writeFile(
      file,
      TEMPLATE({ title: title.trim(), description: description.trim(), date: today(), topic, tags }),
      'utf8',
    );

    console.log(`\n  Created ${relative(ROOT, file)}`);
    console.log(`  Put this post's images in ${relative(ROOT, dir)}/`);
    console.log(`  It will live at /posts/${slug}/`);
    console.log(`\n  Next: npm run dev, then open http://localhost:4321/posts/${slug}/\n`);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error);
  exit(1);
});
