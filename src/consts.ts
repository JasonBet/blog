/**
 * Site-wide configuration.
 *
 * Everything in this file is PUBLIC — it is compiled into the HTML that ships
 * to the browser. Never put an API key, token or password here. Secrets belong
 * in environment variables (see .env.example and SECURITY.md).
 */

export const SITE = {
  /** Shown in the header and used as the fallback <title>. */
  title: 'Jason Betsargon',
  /** One-line site description, used for SEO and the RSS feed. */
  description:
    'Notes from a graduate computer science student — systems, algorithms, machine learning, and the things that only make sense once you write them down.',
  /** Used for author metadata and the RSS feed. */
  author: 'Jason Betsargon',
  /** BCP-47 language tag for <html lang>. */
  lang: 'en',
  /** Default social-share image, relative to /public. */
  defaultOgImage: '/og-default.png',
} as const;

/** Primary navigation. Add an entry here and the header picks it up. */
export const NAV = [
  { label: 'Writing', href: '/posts' },
  { label: 'Topics', href: '/topics' },
  { label: 'Search', href: '/search' },
  { label: 'About', href: '/about' },
] as const;

/** Links rendered in the footer. Leave a value empty to hide that link. */
export const SOCIALS = {
  github: 'https://github.com/JasonBet',
  email: 'jasonbetsargon@gmail.com',
  rss: '/rss.xml',
} as const;

/**
 * Topics are the top-level buckets for posts — one per post, chosen from the
 * keys below. To add a topic, add an entry here; the schema, the /topics page
 * and the topic colour all follow automatically.
 *
 * `accent` is a CSS colour used for the topic's chip and its topic page.
 */
export const TOPICS = {
  systems: {
    name: 'Systems',
    description:
      'Operating systems, distributed systems, networking — how the machine actually behaves under the abstraction.',
    accent: '#B5654A',
  },
  algorithms: {
    name: 'Algorithms',
    description:
      'Design, analysis, and the proofs that turn a clever trick into a guarantee.',
    accent: '#7A6A9B',
  },
  'machine-learning': {
    name: 'Machine Learning',
    description:
      'Models, optimisation, and reading papers slowly enough to actually understand them.',
    accent: '#4F7A6B',
  },
  theory: {
    name: 'Theory',
    description:
      'Complexity, computability, and the parts of the field that stay true regardless of hardware.',
    accent: '#8A6D3B',
  },
} as const;

export type TopicKey = keyof typeof TOPICS;

/** Topic keys as a tuple, for building the Zod enum in content.config.ts. */
export const TOPIC_KEYS = Object.keys(TOPICS) as [TopicKey, ...TopicKey[]];

/**
 * Comments, powered by giscus (GitHub Discussions).
 * Fill these in after following the setup steps in README.md, then flip
 * `enabled` to true. All of these values are public by design — giscus is
 * configured entirely client-side and holds no secret.
 */
interface CommentsConfig {
  enabled: boolean;
  /** owner/repo */
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
}

export const COMMENTS: CommentsConfig = {
  enabled: true,
  repo: 'JasonBet/blog',
  repoId: 'R_kgDOUDLyEQ',
  category: 'Announcements',
  categoryId: 'DIC_kwDOUDLyEc4DEHn6',
};

/** Newsletter signup. The provider API key lives server-side only. */
interface NewsletterConfig {
  enabled: boolean;
  heading: string;
  blurb: string;
}

export const NEWSLETTER: NewsletterConfig = {
  enabled: true,
  heading: 'Get new posts by email',
  blurb: 'Occasional notes on what I am studying. No spam, unsubscribe anytime.',
};

/** How many related posts to show at the bottom of a post. */
export const RELATED_POST_COUNT = 3;
