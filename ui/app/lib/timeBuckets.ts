import { ResolvedTimeframe } from "./timeframe";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Picks a bucket width proportional to the visible range, so a trend always has a handful of
 * buckets to plot instead of collapsing into a single bucket (e.g. every problem landing on the
 * same day when the selected timeframe is only 2 hours wide).
 */
function pickTrendBucketMs(spanMs: number): number {
  if (spanMs <= 3 * HOUR_MS) return 15 * MINUTE_MS;
  if (spanMs <= 2 * DAY_MS) return HOUR_MS;
  if (spanMs <= 30 * DAY_MS) return DAY_MS;
  if (spanMs <= 90 * DAY_MS) return 7 * DAY_MS;
  return 28 * DAY_MS;
}

function formatBucketLabel(date: Date, bucketMs: number): string {
  if (bucketMs < DAY_MS) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export type TrendBucketer = {
  /** Every bucket across the full selected timeframe, in order, zero-filled by callers as needed. */
  buckets: { key: number; label: string }[];
  /** Maps a raw ISO timestamp to the key of the bucket it falls into (matches a `buckets[].key`). */
  keyFor: (timestamp: string) => number;
};

/**
 * Builds the shared bucket boundaries for a trend chart plus a `keyFor` to place a timestamp into
 * one of them — kept together so a bucket list and its lookup function can never drift out of
 * sync (both must be derived from the same fromMs/bucketMs). Shared by lib/problemCharts.ts and
 * lib/entityCharts.ts so every trend on a page bucket identically for a given timeframe.
 */
export function createTrendBucketer(range: ResolvedTimeframe): TrendBucketer {
  const fromMs = range.from.getTime();
  const toMs = Math.max(range.to.getTime(), fromMs + MINUTE_MS);
  const bucketMs = pickTrendBucketMs(toMs - fromMs);
  const bucketStart = (t: number) => fromMs + Math.floor((t - fromMs) / bucketMs) * bucketMs;

  const buckets: { key: number; label: string }[] = [];
  for (let key = bucketStart(fromMs); key <= toMs; key += bucketMs) {
    buckets.push({ key, label: formatBucketLabel(new Date(key), bucketMs) });
  }

  return { buckets, keyFor: (timestamp: string) => bucketStart(new Date(timestamp).getTime()) };
}
