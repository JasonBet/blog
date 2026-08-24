import { getCollection, type CollectionEntry } from 'astro:content';
import readingTime from 'reading-time';
import { RELATED_POST_COUNT, TOPICS, type TopicKey } from '@/consts';

export type Post = CollectionEntry<'blog'>;

/**
 * Turn a collection id into a URL slug.
 * "raft-consensus"        -> "raft-consensus"
 * "raft-consensus/index"  -> "raft-consensus"
 */
export function slugOf(post: Post): string {
  return post.id.replace(/\/index$/, '');
}

export function urlOf(post: Post): string {
  return `/posts/${slugOf(post)}/`;
}

/**
 * Every post that should be publicly visible, newest first.
 * Drafts are included while running `npm run dev` so you can preview them,
 * and excluded from production builds.
 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) =>
    import.meta.env.PROD ? data.draft !== true : true,
  );
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

/** The post to feature on the homepage: newest `featured: true`, else newest. */
export function pickFeatured(posts: Post[]): Post | undefined {
  return posts.find((p) => p.data.featured) ?? posts[0];
}

/** Estimated reading time, e.g. "8 min read". */
export function readTime(post: Post): string {
  return readingTime(post.body ?? '').text;
}

export function topicMeta(key: TopicKey) {
  return TOPICS[key];
}

/**
 * Posts related to `post`, best match first.
 *
 * Scoring is deliberately simple and transparent: sharing a topic is worth
 * more than sharing a single tag, and ties break toward the more recent post.
 * With a small blog this beats anything cleverer, and it never surprises you.
 */
export function getRelated(
  post: Post,
  all: Post[],
  limit = RELATED_POST_COUNT,
): Post[] {
  const tags = new Set(post.data.tags);

  const scored = all
    .filter((candidate) => candidate.id !== post.id)
    .map((candidate) => {
      let score = 0;
      if (candidate.data.topic === post.data.topic) score += 3;
      for (const tag of candidate.data.tags) if (tags.has(tag)) score += 1;
      return { candidate, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.candidate.data.pubDate.getTime() - a.candidate.data.pubDate.getTime(),
    );

  const related = scored.slice(0, limit).map(({ candidate }) => candidate);

  // If nothing scored, fall back to the most recent other posts so the
  // "keep reading" section is never empty on a fresh blog.
  if (related.length < limit) {
    for (const candidate of all) {
      if (related.length >= limit) break;
      if (candidate.id === post.id) continue;
      if (related.some((r) => r.id === candidate.id)) continue;
      related.push(candidate);
    }
  }

  return related;
}

/** All tags in use, with counts, most-used first. */
export function collectTags(posts: Post[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Post counts per topic, in the order topics are declared in consts.ts. */
export function collectTopics(posts: Post[]): { key: TopicKey; count: number }[] {
  return (Object.keys(TOPICS) as TopicKey[]).map((key) => ({
    key,
    count: posts.filter((p) => p.data.topic === key).length,
  }));
}

/** Group posts by publication year, newest year first. */
export function groupByYear(posts: Post[]): { year: number; posts: Post[] }[] {
  const groups = new Map<number, Post[]>();
  for (const post of posts) {
    // UTC to match how FormattedDate renders — see that component.
    const year = post.data.pubDate.getUTCFullYear();
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year)!.push(post);
  }
  return [...groups.entries()]
    .map(([year, posts]) => ({ year, posts }))
    .sort((a, b) => b.year - a.year);
}
