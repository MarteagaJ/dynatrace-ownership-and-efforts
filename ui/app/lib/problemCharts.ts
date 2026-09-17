import { PROBLEM_CATEGORY_LABELS } from "./queries";
import { createTrendBucketer } from "./timeBuckets";
import { ProblemRecord } from "./types";
import { ResolvedTimeframe } from "./timeframe";

/**
 * Buckets a list of ISO timestamps into zero-filled counts across the entire selected timeframe,
 * so a trend always renders — even with zero or a single event — rather than only plotting the
 * buckets that happen to have data.
 *
 * Rendered as a custom LineChart/BarChart rather than a TimeseriesChart: as of
 * strato-components@3.11.0 (latest published), TimeseriesChart renders nothing at all for any
 * non-empty data — reproduced in isolation with the library's own documented sample data, in both
 * its default and __useLegacy renderers — while the custom components (used elsewhere on this
 * page) render fine.
 */
function bucketTimestamps(timestamps: string[], range: ResolvedTimeframe): { category: string; value: number }[] {
  const bucketer = createTrendBucketer(range);
  const counts = new Map<number, number>();
  for (const timestamp of timestamps) {
    const key = bucketer.keyFor(timestamp);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return bucketer.buckets.map((b) => ({ category: b.label, value: counts.get(b.key) ?? 0 }));
}

/** Count of problems opened per time bucket. */
export function buildProblemTrend(problems: ProblemRecord[], range: ResolvedTimeframe): { category: string; value: number }[] {
  return bucketTimestamps(problems.map((p) => p.start), range);
}

/** Count of comments/annotations added per time bucket, keyed by each comment's own timestamp (not the problem's start time). */
export function buildCommentsTrend(commentTimestamps: string[], range: ResolvedTimeframe): { category: string; value: number }[] {
  return bucketTimestamps(commentTimestamps, range);
}

/**
 * Average MTTR (minutes) among problems that closed within each time bucket (bucketed by the
 * problem's start time), zero-filled for buckets with no closed problems — a 0 there means "no
 * problems resolved in this window", not an instant resolution.
 */
export function buildMttrTrend(problems: ProblemRecord[], range: ResolvedTimeframe): { category: string; value: number }[] {
  const bucketer = createTrendBucketer(range);
  const sums = new Map<number, number>();
  const counts = new Map<number, number>();
  for (const problem of problems) {
    if (problem.status !== "CLOSED" || typeof problem.durationMinutes !== "number") continue;
    const key = bucketer.keyFor(problem.start);
    sums.set(key, (sums.get(key) ?? 0) + problem.durationMinutes);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return bucketer.buckets.map((b) => {
    const count = counts.get(b.key) ?? 0;
    const avg = count > 0 ? (sums.get(b.key) ?? 0) / count : 0;
    return { category: b.label, value: Math.round(avg * 10) / 10 };
  });
}

const TOP_DURATION_LIMIT = 5;

/**
 * The team's longest-running problems in range, sorted descending by duration (minutes). Only
 * problems with a known duration (i.e. already closed) are eligible.
 */
export function buildTopProblemsByDuration(problems: ProblemRecord[]): { category: string; value: number }[] {
  return problems
    .filter((p): p is ProblemRecord & { durationMinutes: number } => typeof p.durationMinutes === "number")
    .sort((a, b) => b.durationMinutes - a.durationMinutes)
    .slice(0, TOP_DURATION_LIMIT)
    .map((p) => ({ category: `${p.displayId} — ${p.name}`, value: Math.round(p.durationMinutes * 10) / 10 }));
}

/** Problem count per category (Availability, Error, Slowdown, ...), sorted highest-first. */
export function buildCategoryBreakdown(problems: ProblemRecord[]): { category: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const problem of problems) {
    counts.set(problem.category, (counts.get(problem.category) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);
}

/** Problem count per Davis severity level (1-4), ordered from least to most severe. */
export function buildSeverityBreakdown(problems: ProblemRecord[]): { category: string; value: number }[] {
  const counts = new Map<number, number>();
  for (const problem of problems) {
    counts.set(problem.severity, (counts.get(problem.severity) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a - b)
    .map(([severity, value]) => ({ category: `Severity ${severity}`, value }));
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_BUCKET_LABELS = ["00–04", "04–08", "08–12", "12–16", "16–20", "20–24"];

export type OccurrenceHeatmapData = { rows: string[]; columns: string[]; cells: number[][] };

/**
 * Problem count by day-of-week x 4-hour bucket, as a dense grid (every combination present,
 * zero-filled) so the heatmap always shows the full set of buckets rather than only the ones
 * that had problems.
 */
export function buildOccurrenceHeatmap(problems: ProblemRecord[]): OccurrenceHeatmapData {
  const counts = new Map<string, number>();
  for (const problem of problems) {
    const date = new Date(problem.start);
    const day = DAY_LABELS[date.getDay()];
    const hourBucket = HOUR_BUCKET_LABELS[Math.floor(date.getHours() / 4)];
    const key = `${day}|${hourBucket}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const cells = DAY_LABELS.map((day) => HOUR_BUCKET_LABELS.map((hourBucket) => counts.get(`${day}|${hourBucket}`) ?? 0));
  return { rows: DAY_LABELS, columns: HOUR_BUCKET_LABELS, cells };
}

const SEVERITY_LEVELS = [1, 2, 3, 4];

/**
 * Sum of workflow automations triggered per problem category x severity, zero-filled across the
 * full category/severity space (same "always show the full grid" convention as the occurrence
 * heatmap above).
 */
export function buildAutomationsHeatmap(problems: ProblemRecord[]): OccurrenceHeatmapData {
  const categories = Object.values(PROBLEM_CATEGORY_LABELS);
  const columns = SEVERITY_LEVELS.map((severity) => `Sev ${severity}`);
  const sums = new Map<string, number>();
  for (const problem of problems) {
    const key = `${problem.category}|${problem.severity}`;
    sums.set(key, (sums.get(key) ?? 0) + problem.automationsTriggered);
  }
  const cells = categories.map((category) =>
    SEVERITY_LEVELS.map((severity) => sums.get(`${category}|${severity}`) ?? 0),
  );
  return { rows: categories, columns, cells };
}

const NOISIEST_ENTITIES_LIMIT = 12;

/** Top entities by how many of this team's problems affected them, i.e. the noisiest offenders. */
export function buildNoisiestEntities(problems: ProblemRecord[]): { name: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const problem of problems) {
    for (const entityName of problem.affectedEntityNames) {
      counts.set(entityName, (counts.get(entityName) ?? 0) + 1);
    }
  }
  const sorted = Array.from(counts.entries()).sort(([, a], [, b]) => b - a);
  const top = sorted.slice(0, NOISIEST_ENTITIES_LIMIT);
  const otherTotal = sorted.slice(NOISIEST_ENTITIES_LIMIT).reduce((sum, [, count]) => sum + count, 0);
  const nodes = top.map(([name, value]) => ({ name, value }));
  if (otherTotal > 0) {
    nodes.push({ name: "Other", value: otherTotal });
  }
  return nodes;
}

/** Traffic-light color for an MTTR gauge against a fixed 30/60-minute target. */
export function getMttrGaugeColor(avgMttrMinutes: number | undefined): string | undefined {
  if (avgMttrMinutes === undefined) return undefined;
  if (avgMttrMinutes < 30) return "green";
  if (avgMttrMinutes < 60) return "orange";
  return "red";
}
