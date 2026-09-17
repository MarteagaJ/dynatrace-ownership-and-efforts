import { findCostCenter, findCostProduct, parseTechnologyName } from "./entityTags";
import type { OccurrenceHeatmapData } from "./problemCharts";
import { createTrendBucketer } from "./timeBuckets";
import type { ResolvedTimeframe } from "./timeframe";
import { EntitySummary, ProblemRecord } from "./types";

const TOP_N_LIMIT = 8;

function topNWithOther(counts: Map<string, number>, limit = TOP_N_LIMIT): { category: string; value: number }[] {
  const sorted = Array.from(counts.entries()).sort(([, a], [, b]) => b - a);
  const top = sorted.slice(0, limit);
  const otherTotal = sorted.slice(limit).reduce((sum, [, count]) => sum + count, 0);
  const result = top.map(([category, value]) => ({ category, value }));
  if (otherTotal > 0) result.push({ category: "Other", value: otherTotal });
  return result;
}

/** Entity count by kind (Host, Service, Kubernetes deployment, ...), sorted highest-first. */
export function buildEntityTypeBreakdown(entities: EntitySummary[]): { category: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const entity of entities) {
    counts.set(entity.entityType, (counts.get(entity.entityType) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Distinct technology names in use across owned entities (deduped per entity, so a host running
 * two JAVA versions still only counts once), top N + "Other". Only Host/Service entities carry
 * softwareTechnologies data (see buildEntityRosterQuery in lib/queries.ts).
 */
export function buildTechnologyBreakdown(entities: EntitySummary[]): { category: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const entity of entities) {
    const seen = new Set<string>();
    for (const raw of entity.softwareTechnologies) {
      const name = parseTechnologyName(raw);
      if (name && !seen.has(name)) {
        seen.add(name);
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
  }
  return topNWithOther(counts);
}

const COST_UNSPECIFIED = "Unspecified";
const COST_TOP_N = 6;

/**
 * Entity count by cost center x cost product (from the "dt.cost.costcenter"/"dt.cost.product"
 * tag convention — confirmed live against a real tenant, see lib/entityTags.ts), capped to the
 * top cost centers/products with an "Other" catch-all row/column for the rest.
 */
export function buildCostAllocationHeatmap(entities: EntitySummary[]): OccurrenceHeatmapData {
  const centerCounts = new Map<string, number>();
  const productCounts = new Map<string, number>();
  for (const entity of entities) {
    const center = findCostCenter(entity.tags) ?? COST_UNSPECIFIED;
    const product = findCostProduct(entity.tags) ?? COST_UNSPECIFIED;
    centerCounts.set(center, (centerCounts.get(center) ?? 0) + 1);
    productCounts.set(product, (productCounts.get(product) ?? 0) + 1);
  }

  const topCenters = [...centerCounts.entries()].sort(([, a], [, b]) => b - a).slice(0, COST_TOP_N).map(([c]) => c);
  const topProducts = [...productCounts.entries()].sort(([, a], [, b]) => b - a).slice(0, COST_TOP_N).map(([p]) => p);
  const rows = centerCounts.size > COST_TOP_N ? [...topCenters, "Other"] : topCenters;
  const columns = productCounts.size > COST_TOP_N ? [...topProducts, "Other"] : topProducts;

  const bucketRow = (center: string) => (topCenters.includes(center) ? center : "Other");
  const bucketCol = (product: string) => (topProducts.includes(product) ? product : "Other");

  const cellCounts = new Map<string, number>();
  for (const entity of entities) {
    const row = bucketRow(findCostCenter(entity.tags) ?? COST_UNSPECIFIED);
    const col = bucketCol(findCostProduct(entity.tags) ?? COST_UNSPECIFIED);
    const key = `${row}|${col}`;
    cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
  }
  const cells = rows.map((row) => columns.map((col) => cellCounts.get(`${row}|${col}`) ?? 0));
  return { rows, columns, cells };
}

/** Entity count per Smartscape security context label (e.g. "Cloud: AWS"), top N + "Other"/"Uncategorized". */
export function buildSecurityContextBreakdown(entities: EntitySummary[]): { category: string; value: number }[] {
  const counts = new Map<string, number>();
  let uncategorized = 0;
  for (const entity of entities) {
    if (entity.securityContext.length === 0) {
      uncategorized += 1;
      continue;
    }
    for (const context of entity.securityContext) {
      counts.set(context, (counts.get(context) ?? 0) + 1);
    }
  }
  const result = topNWithOther(counts);
  if (uncategorized > 0) result.push({ category: "Uncategorized", value: uncategorized });
  return result;
}

/**
 * Buckets each entity by its current problem exposure: caught up in an active problem right now,
 * only ever affected by closed/historical problems, or clean. Matches problems to entities via
 * affected_entity_ids, which is overwritten in buildProblemsQuery to use Smartscape IDs — the
 * same ID space as this roster's own `id` (see buildEntityRosterQuery in lib/queries.ts).
 */
export function buildEntityHealthBreakdown(
  entities: EntitySummary[],
  problems: ProblemRecord[],
): { category: string; value: number }[] {
  const activeIds = new Set<string>();
  const closedIds = new Set<string>();
  for (const problem of problems) {
    for (const id of problem.affectedEntityIds) {
      if (problem.status === "ACTIVE") activeIds.add(id);
      else closedIds.add(id);
    }
  }

  let active = 0;
  let closedOnly = 0;
  let healthy = 0;
  for (const entity of entities) {
    if (activeIds.has(entity.id)) active += 1;
    else if (closedIds.has(entity.id)) closedOnly += 1;
    else healthy += 1;
  }

  return [
    { category: "No problems", value: healthy },
    { category: "Closed problems only", value: closedOnly },
    { category: "Active problem(s)", value: active },
  ];
}

const ROOT_CAUSE_LIMIT = 8;

/** Which entities Davis most often names as the root cause (not merely "affected"), top N + "Other". */
export function buildRootCauseHotspots(problems: ProblemRecord[]): { category: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const problem of problems) {
    if (!problem.rootCauseEntityName) continue;
    counts.set(problem.rootCauseEntityName, (counts.get(problem.rootCauseEntityName) ?? 0) + 1);
  }
  return topNWithOther(counts, ROOT_CAUSE_LIMIT);
}

const AGE_BUCKETS: { label: string; maxDays: number }[] = [
  { label: "< 7 days", maxDays: 7 },
  { label: "7-30 days", maxDays: 30 },
  { label: "30-90 days", maxDays: 90 },
  { label: "90+ days", maxDays: Infinity },
];

/** Entity count by how long ago each was first discovered (Smartscape lifetime.start), zero-filled across every bucket. */
export function buildEntityAgeBreakdown(entities: EntitySummary[]): { category: string; value: number }[] {
  const counts = new Map<string, number>(AGE_BUCKETS.map((bucket) => [bucket.label, 0]));
  let unknown = 0;
  const now = Date.now();
  for (const entity of entities) {
    if (!entity.lifetime?.start) {
      unknown += 1;
      continue;
    }
    const ageDays = (now - new Date(entity.lifetime.start).getTime()) / (24 * 60 * 60 * 1000);
    const bucket = AGE_BUCKETS.find((b) => ageDays <= b.maxDays) ?? AGE_BUCKETS[AGE_BUCKETS.length - 1];
    counts.set(bucket.label, (counts.get(bucket.label) ?? 0) + 1);
  }
  const result = AGE_BUCKETS.map((bucket) => ({ category: bucket.label, value: counts.get(bucket.label) ?? 0 }));
  if (unknown > 0) result.push({ category: "Unknown", value: unknown });
  return result;
}

/**
 * Count of distinct entities affected by at least one problem in each time bucket (bucketed by
 * the problem's start time), zero-filled across the timeframe. An entity affected by two
 * problems in the same bucket is only counted once for that bucket.
 */
export function buildAffectedEntitiesTrend(
  problems: ProblemRecord[],
  range: ResolvedTimeframe,
): { category: string; value: number }[] {
  const bucketer = createTrendBucketer(range);
  const idsByBucket = new Map<number, Set<string>>();
  for (const problem of problems) {
    const key = bucketer.keyFor(problem.start);
    const ids = idsByBucket.get(key) ?? new Set<string>();
    for (const id of problem.affectedEntityIds) ids.add(id);
    idsByBucket.set(key, ids);
  }
  return bucketer.buckets.map((b) => ({ category: b.label, value: idsByBucket.get(b.key)?.size ?? 0 }));
}

/**
 * Count of distinct entities named as a problem's root cause in each time bucket (bucketed by the
 * problem's start time), zero-filled across the timeframe.
 */
export function buildRootCauseEntitiesTrend(
  problems: ProblemRecord[],
  range: ResolvedTimeframe,
): { category: string; value: number }[] {
  const bucketer = createTrendBucketer(range);
  const namesByBucket = new Map<number, Set<string>>();
  for (const problem of problems) {
    if (!problem.rootCauseEntityName) continue;
    const key = bucketer.keyFor(problem.start);
    const names = namesByBucket.get(key) ?? new Set<string>();
    names.add(problem.rootCauseEntityName);
    namesByBucket.set(key, names);
  }
  return bucketer.buckets.map((b) => ({ category: b.label, value: namesByBucket.get(b.key)?.size ?? 0 }));
}
