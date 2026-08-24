import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

import { SITE, TOPICS } from '@/consts';
import { getPosts, urlOf } from '@/lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts();

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site!,
    trailingSlash: false,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: urlOf(post),
      categories: [TOPICS[post.data.topic].name, ...post.data.tags],
    })),
    customData: `<language>en-us</language>`,
  });
}
