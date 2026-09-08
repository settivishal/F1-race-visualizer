import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Race data changes once a week, when the ingest job runs, so rendering it
  // per request is waste — and on Neon's free tier it is worse than waste,
  // because the compute autosuspends and a sporadic visitor is the one who
  // pays the cold start. Cache Components lets a page be cached and then
  // invalidated by tag at the moment the data actually changes, rather than on
  // a timer that is wrong in both directions.
  //
  // See docs/decisions.md, "Rendering: ISR, revalidated by the ingest job".
  cacheComponents: true,

  // With Cache Components alone, a <Link prefetch> asks for the destination's
  // dynamic content too, and dev flags every race-card prefetch as an expensive
  // one. Partial Prefetching makes a plain <Link> fetch the route's shared App
  // Shell instead, and prefetch={true} adds only the params-dependent part — so
  // the twenty cards on /races warm one shell between them rather than twenty
  // renders. The race pages read `params`, which is exactly the case the docs
  // say to keep prefetch={true} for.
  partialPrefetching: true,

  // No `images.remotePatterns`, deliberately. The entry that used to be here
  // allowed media.formula1.com for the circuit maps in lib/circuit-data.ts —
  // and that file was deleted in M6.4, so nothing has hotlinked anything since.
  // An allowlist for a host no image is loaded from is a permission granted for
  // no reason.
  //
  // Driver headshot URLs are still ingested and stored, and are still displayed
  // nowhere: they are not licensed for this project to republish, which /about
  // says in as many words. Mirroring them into Vercel Blob would republish them
  // from our own domain, which is further from that position rather than closer
  // to it.
};

export default nextConfig;
