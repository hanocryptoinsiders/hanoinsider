export type CatalogItem = {
  id: string;
  title: string;
  tag: string;
  img: string;
  body?: string;
  time?: string;
  read?: string;
  likes?: number;
  comments?: number;
  date?: string;
  dur?: string;
  progress?: number;
  /** Long-form markdown-ish body used by the reader. */
  content?: string;
  /** Author byline override. */
  author?: string;
};

const SAMPLE_BODY = `## The setup

Across the last 48 hours, we've watched **liquidity** quietly rotate back into the mid-cap basket. Funding stays neutral, perp open-interest is climbing, and on-chain flows confirm the move.

> The cleanest market context are the ones the timeline ignores.

### What changed

- Mid-cap AI basket up *+11.4%* on the week
- ETH/BTC reclaimed its weekly pivot
- Stablecoin float on exchanges down ==$1.2B== in three sessions

![Daily structure shift on the BTC chart](https://images.unsplash.com/photo-1640340434855-6084b1f4901c?auto=format&fit=crop&w=1600&q=80)

### How we're positioned

We're long structure, not levels. Risk stays defined at the prior low; invalidation is mechanical, not emotional. If the dollar rolls from here, the trade compounds.

1. Add on retests of broken resistance
2. Reduce into the next liquidity pocket
3. Re-enter only if structure stays intact

---

This is not financial advice. This is investor intelligence - written by humans, not bots. Open the dashboard for the live chart and the [member dashboard](https://t.me/).`;

export const INSIGHT_CATALOG: CatalogItem[] = [
  { id: "ins-1", img: "/assets/hanoinfrontend/hero-mascot.jpg", tag: "MARKET context", title: "Liquidity rotating back into AI narratives - what the flows say", body: "Mid-cap AI basket up +11.4% on the week. Funding still neutral. Here's the read.", read: "3 min", time: "14m ago", likes: 312, comments: 48 },
  { id: "ins-2", img: "/assets/hanoinfrontend/bird-mascot.jpg", tag: "Ethereum", title: "ETH/BTC structure shift on the daily", body: "First higher high since April. Rotation thesis firming up.", time: "5h ago", read: "4 min", likes: 98, comments: 14 },
  { id: "ins-3", img: "/assets/hanoinfrontend/article-cover.jpg", tag: "Altcoins", title: "Altcoin rotation index - where capital is moving", body: "Mid-caps catching the bid. This is what late-cycle looks like.", time: "8h ago", read: "5 min", likes: 76, comments: 19 },
  { id: "ins-4", img: "/assets/hanoinfrontend/hero-mascot.jpg", tag: "Macro", title: "DXY breakdown thesis - risk-on tailwind", body: "If dollar rolls here, crypto runs. The setup mirrors Q4 2023.", time: "1d ago", read: "6 min", likes: 211, comments: 41 },
  { id: "ins-5", img: "/assets/hanoinfrontend/bird-mascot.jpg", tag: "On-chain", title: "Whale accumulation accelerating", body: "Wallets >1K BTC adding into weakness. A familiar tell.", time: "1d ago", read: "4 min", likes: 188, comments: 32 },
  { id: "ins-6", img: "/assets/hanoinfrontend/article-cover.jpg", tag: "Trading", title: "Three setups I'm watching this week", body: "Two longs, one short. Defined invalidation on each.", time: "2d ago", read: "7 min", likes: 154, comments: 27 },
  { id: "ins-7", img: "/assets/hanoinfrontend/hero-mascot.jpg", tag: "Bitcoin", title: "Bitcoin liquidity sweep below 67K", body: "Tagged a key pool - here's the structure I'm watching.", time: "2d ago", read: "3 min", likes: 142, comments: 23 },
];

export const ARTICLE_CATALOG: CatalogItem[] = [
  { id: "art-1", img: "/assets/hanoinfrontend/hero-mascot.jpg", tag: "MACRO", title: "The rate cycle and crypto: a framework for 2026", body: "Liquidity, the dollar, and what history tells us about the next 12 months.", read: "12 min", date: "May 10, 2026" },
  { id: "art-2", img: "/assets/hanoinfrontend/bird-mascot.jpg", tag: "ON-CHAIN", title: "Reading whale wallets without falling for noise", read: "8 min", date: "May 8" },
  { id: "art-3", img: "/assets/hanoinfrontend/article-cover.jpg", tag: "ETHEREUM", title: "The L2 thesis revisited - three years in", read: "14 min", date: "May 5" },
  { id: "art-4", img: "/assets/hanoinfrontend/hero-mascot.jpg", tag: "EDUCATION", title: "Order flow basics for the modern trader", read: "9 min", date: "May 2" },
  { id: "art-5", img: "/assets/hanoinfrontend/bird-mascot.jpg", tag: "MACRO", title: "Why correlation regimes matter more than price", read: "11 min", date: "Apr 28" },
  { id: "art-6", img: "/assets/hanoinfrontend/article-cover.jpg", tag: "ALTCOINS", title: "Anatomy of a meta - RWA in real numbers", read: "7 min", date: "Apr 24" },
];

export const VIDEO_CATALOG: CatalogItem[] = [
  { id: "vid-1", img: "/assets/hanoinfrontend/hero-mascot.jpg", title: "BTC breakdown - May market review", dur: "24:15", date: "May 12", tag: "MARKET REVIEW", progress: 62 },
  { id: "vid-2", img: "/assets/hanoinfrontend/bird-mascot.jpg", title: "How I read order flow in real time", dur: "18:42", date: "May 8", tag: "EDUCATION", progress: 28 },
  { id: "vid-3", img: "/assets/hanoinfrontend/article-cover.jpg", title: "Macro framework: liquidity & flows", dur: "31:08", date: "May 5", tag: "MACRO", progress: 84 },
  { id: "vid-4", img: "/assets/hanoinfrontend/hero-mascot.jpg", title: "Three trades I'm watching this week", dur: "14:55", date: "May 2", tag: "SETUPS", progress: 0 },
  { id: "vid-5", img: "/assets/hanoinfrontend/bird-mascot.jpg", title: "On-chain deep-dive - whale wallets", dur: "22:30", date: "Apr 28", tag: "ON-CHAIN", progress: 0 },
  { id: "vid-6", img: "/assets/hanoinfrontend/article-cover.jpg", title: "The case for ETH/BTC reversal", dur: "16:12", date: "Apr 22", tag: "ANALYSIS", progress: 0 },
];

// Attach a default rich body for any item missing one so every detail page
// renders a real reader experience even before the admin writes one.
[INSIGHT_CATALOG, ARTICLE_CATALOG].forEach((cat) => {
  cat.forEach((i) => { if (!i.content) i.content = SAMPLE_BODY; if (!i.author) i.author = "The Hano Insiders"; });
});

export const CATALOGS = {
  insights: INSIGHT_CATALOG,
  articles: ARTICLE_CATALOG,
  videos: VIDEO_CATALOG,
} as const;

export type Section = keyof typeof CATALOGS;

