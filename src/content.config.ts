import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { TOPIC_KEYS } from './consts';

/**
 * Blog posts.
 *
 * Two layouts are supported and can be mixed freely:
 *
 *   src/content/blog/my-post.mdx            -> /posts/my-post
 *   src/content/blog/my-post/index.mdx      -> /posts/my-post
 *       (put the post's images in that same folder)
 *
 * Files and folders starting with "_" are ignored, which makes "_drafts/"
 * a convenient scratch area.
 */
const blog = defineCollection({
  loader: glob({
    base: './src/content/blog',
    pattern: '**/[!_]*.{md,mdx}',
  }),
  schema: ({ image }) =>
    z.object({
      /** Post title. Also used as the <h1> and the social-card headline. */
      title: z.string().min(1).max(140),
      /** One or two sentences. Shown in listings, search results and SEO tags. */
      description: z.string().min(1).max(300),
      /** Publication date, e.g. 2026-08-24. */
      pubDate: z.coerce.date(),
      /** Optional: set when you meaningfully revise an already-published post. */
      updatedDate: z.coerce.date().optional(),
      /** Exactly one topic, chosen from the keys of TOPICS in src/consts.ts. */
      topic: z.enum(TOPIC_KEYS),
      /** Free-form tags for cross-cutting themes. Lowercase, hyphenated. */
      tags: z.array(z.string().min(1)).default([]),
      /** Optional cover image, relative to the post file, e.g. ./cover.jpg */
      cover: image().optional(),
      /** Alt text for the cover. Required whenever a cover is set. */
      coverAlt: z.string().optional(),
      /** Drafts are visible with `npm run dev` but never built for production. */
      draft: z.boolean().default(false),
      /** Pin this post to the top of the homepage hero. */
      featured: z.boolean().default(false),
    })
    .refine((data) => !data.cover || (data.coverAlt && data.coverAlt.length > 0), {
      message: 'coverAlt is required when a cover image is set (accessibility).',
      path: ['coverAlt'],
    }),
});

export const collections = { blog };
