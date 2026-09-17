import type { Timeframe, TimeValue } from "@dynatrace/strato-components/core";

/** A from/to pair already formatted for direct interpolation into a DQL `fetch ..., from:, to:` clause. */
export type DqlTimeframe = { from: string; to: string };

/**
 * Shorthand accepted by TimeframeSelector's `defaultValue` prop. Kept short (2h) since a 30-day
 * window makes the problems/entity queries slow to load on first render.
 */
export const DEFAULT_TIMEFRAME_VALUE = { from: "now()-2h", to: "now()" };

export const DEFAULT_DQL_TIMEFRAME: DqlTimeframe = DEFAULT_TIMEFRAME_VALUE;

function toDqlTimeExpression(value: TimeValue): string {
  // Relative expressions (e.g. "now()-2h") are valid DQL as-is; absolute picks need to be a quoted string literal.
  return value.type === "iso8601" ? `"${value.value}"` : value.value;
}

/** Converts a TimeframeSelector onChange value into DQL-ready from/to fragments. */
export function toDqlTimeframe(timeframe: Timeframe | null): DqlTimeframe {
  if (!timeframe) return DEFAULT_DQL_TIMEFRAME;
  return { from: toDqlTimeExpression(timeframe.from), to: toDqlTimeExpression(timeframe.to) };
}

/** A from/to pair resolved to concrete points in time, for client-side bucketing (e.g. trend charts). */
export type ResolvedTimeframe = { from: Date; to: Date };

/** Matches DEFAULT_TIMEFRAME_VALUE ("now()-2h" to "now()"), resolved to concrete Dates. */
export function defaultResolvedTimeframe(): ResolvedTimeframe {
  return { from: new Date(Date.now() - 2 * 60 * 60 * 1000), to: new Date() };
}

/**
 * Converts a TimeframeSelector onChange value into concrete Dates via `absoluteDate`, which
 * Strato resolves for us even for relative expressions like "now()-2h".
 */
export function toResolvedTimeframe(timeframe: Timeframe | null): ResolvedTimeframe {
  if (!timeframe) return defaultResolvedTimeframe();
  return { from: new Date(timeframe.from.absoluteDate), to: new Date(timeframe.to.absoluteDate) };
}
