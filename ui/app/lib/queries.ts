import type { DqlTimeframe } from "./timeframe";

/**
 * Single shared lookup file holding every manual entity-to-team override, replacing the old
 * per-app document store. Namespaced under a dedicated prefix so an IAM policy can grant
 * storage:files:write/delete scoped to `storage:file-path startsWith "/lookups/ownership-and-efforts/"`
 * instead of blanket access to every lookup file in the tenant. See lib/useOwnershipRegistry.ts.
 */
export const OWNERSHIP_OVERRIDES_FILE_PATH = "/lookups/ownership-and-efforts/entity-team-overrides";

export function buildOwnershipOverridesQuery(): string {
  return `load "${OWNERSHIP_OVERRIDES_FILE_PATH}"`;
}

/**
 * Dense, machine-regenerated export of every entity's *resolved* team (override, else tag-based
 * auto-detect), refreshed hourly by the regenerate-entity-team-assignments function/workflow —
 * see api/regenerate-entity-team-assignments.function.ts. Kept as a separate file from
 * OWNERSHIP_OVERRIDES_FILE_PATH (the sparse, human-edited source of intent) so the hourly
 * regeneration job never races the Entities page's manual-edit save flow. Entities that resolve
 * to "unassigned" get no row here, consistent with the overrides file's own convention.
 */
export const ENTITY_TEAM_ASSIGNMENTS_FILE_PATH = "/lookups/ownership-and-efforts/entity-team-assignments";

/**
 * Strips characters that could break out of a double-quoted DQL string literal. Rather than
 * trying to replicate DQL's own escaping rules, this simply removes quote/backslash characters
 * from user-typed filter values before they're interpolated into a query string, which closes
 * off the injection vector entirely (at the minor cost of not being able to filter on a literal
 * quote or backslash).
 */
function sanitizeForDqlLiteral(value: string): string {
  return value.replace(/["\\]/g, "").trim();
}

/**
 * High enough that no realistic tenant has more of a single entity kind than this — counts,
 * charts, and tables all depend on the *complete* roster for the selected timeframe/filters, not
 * a display-sized sample, so this must cover the tenant's true entity count, not just what looks
 * good in a table (table row display is capped separately, see MAX_TABLE_ROWS in lib/types.ts).
 */
const DEFAULT_ROSTER_LIMIT_PER_KIND = 5000;

/** There are 5 entity kinds in the roster (Host, Service, K8s deployment, Web application, Frontend). */
const ENTITY_ROSTER_KIND_COUNT = 5;

/**
 * Ceiling to pass as `useDql`'s `maxResultRecords` for the entity roster query — that option
 * defaults to 1000 regardless of the DQL query's own `limit`, so it must be raised to match or
 * the result set gets silently truncated a second time after the DQL-side limit already applied.
 */
export const ENTITY_ROSTER_MAX_RESULT_RECORDS = DEFAULT_ROSTER_LIMIT_PER_KIND * ENTITY_ROSTER_KIND_COUNT;

export type EntityRosterFilters = {
  /** Exact match against the roster's aliased `entityType` field. */
  entityType?: string;
  /** Case-insensitive substring match against the roster's aliased `name` field. */
  nameContains?: string;
  /**
   * Per-entity-kind row cap (there are 5 kinds, so total rows can be up to 5x this). Defaults to
   * DEFAULT_ROSTER_LIMIT_PER_KIND. Pass a higher value only if a tenant genuinely exceeds that
   * per-kind (the regenerate-entity-team-assignments function does this defensively).
   */
  limitPerKind?: number;
};

/**
 * Unified roster of hosts, services, Kubernetes deployments, web applications, and frontends,
 * sourced from Smartscape (smartscapeNodes) for topology/IDs, with a lookup back to the classic
 * dt.entity.* table for `tags`. Smartscape's own `tags` field only exposes cloud-provider tags and
 * Kubernetes labels/annotations — it drops custom/manual tags like "dt.owner:team-x" that this
 * app's ownership detection depends on, so those still have to come from the classic table via
 * `id_classic` (the field Smartscape nodes carry back to their classic entity ID).
 * Note: Smartscape node IDs are NOT the same values as classic dt.entity.* IDs in general
 * (id_classic bridges the two here), so anything keyed by entity ID elsewhere in the app
 * (e.g. saved manual overrides) is keyed by these Smartscape IDs going forward.
 * `type` and `lifetime` are carried through alongside `id`/`name` because the native
 * "view-entity-dt.smartscape.*" intents (see lib/entities.ts) expect that exact record shape
 * as their payload, not just the entity ID. `dt.security_context` is carried through purely for
 * display (Entities table column) — usually an empty array in practice.
 * FRONTEND smartscape nodes are split into "Web application" (frontend.type == "web", which has a
 * classic dt.entity.application counterpart and a dedicated viewer app) and generic "Frontend"
 * (everything else, e.g. mobile — no classic Application entity or dedicated viewer app exists for
 * these, so they fall back to a "Go to Settings" intent instead; see lib/entities.ts).
 * `softwareTechnologies` is only requested for Host/Service — confirmed live that
 * dt.entity.cloud_application and dt.entity.application don't have that field at all (a `fields`
 * selector naming it there throws FIELD_DOES_NOT_EXIST); Kubernetes deployment/Frontend rows just
 * come back without it, which `append` tolerates fine (missing field, not an error).
 */
export function buildEntityRosterQuery(filters?: EntityRosterFilters): string {
  const conditions: string[] = [];
  if (filters?.entityType) {
    conditions.push(`entityType == "${sanitizeForDqlLiteral(filters.entityType)}"`);
  }
  if (filters?.nameContains) {
    conditions.push(`contains(name, "${sanitizeForDqlLiteral(filters.nameContains)}", caseSensitive: false)`);
  }
  const filterClause = conditions.length > 0 ? `\n| filter ${conditions.join(" and ")}` : "";
  const limitPerKind = filters?.limitPerKind ?? DEFAULT_ROSTER_LIMIT_PER_KIND;

  return `smartscapeNodes "HOST"
| fields id, name, id_classic, type, lifetime, dt.security_context
| lookup [fetch dt.entity.host | fields id, tags, softwareTechnologies], sourceField: id_classic, lookupField: id, fields: {tags, softwareTechnologies}
| fieldsAdd entityType = "Host"
| limit ${limitPerKind}
| append [
    smartscapeNodes "SERVICE"
    | fields id, name, id_classic, type, lifetime, dt.security_context
    | lookup [fetch dt.entity.service | fields id, tags, softwareTechnologies], sourceField: id_classic, lookupField: id, fields: {tags, softwareTechnologies}
    | fieldsAdd entityType = "Service"
    | limit ${limitPerKind}
  ]
| append [
    smartscapeNodes "K8S_DEPLOYMENT"
    | fields id, name, id_classic, type, lifetime, dt.security_context
    | lookup [fetch dt.entity.cloud_application | fields id, tags], sourceField: id_classic, lookupField: id, fields: {tags}
    | fieldsAdd entityType = "Kubernetes deployment"
    | limit ${limitPerKind}
  ]
| append [
    smartscapeNodes "FRONTEND"
    | filter frontend.type == "web"
    | fields id, name, id_classic, type, lifetime, dt.security_context
    | lookup [fetch dt.entity.application | fields id, tags], sourceField: id_classic, lookupField: id, fields: {tags}
    | fieldsAdd entityType = "Web application"
    | limit ${limitPerKind}
  ]
| append [
    smartscapeNodes "FRONTEND"
    | filter frontend.type != "web"
    | fields id, name, id_classic, type, lifetime, dt.security_context
    | lookup [fetch dt.entity.application | fields id, tags], sourceField: id_classic, lookupField: id, fields: {tags}
    | fieldsAdd entityType = "Frontend"
    | limit ${limitPerKind}
  ]${filterClause}
| sort entityType asc, name asc`;
}

/** Maps dt.davis.problems' raw event.category values to display labels, confirmed via a live tenant. */
export const PROBLEM_CATEGORY_LABELS: Record<string, string> = {
  AVAILABILITY: "Availability",
  ERROR: "Error",
  SLOWDOWN: "Slowdown",
  RESOURCE_CONTENTION: "Resource contention",
  CUSTOM_ALERT: "Custom",
  MONITORING_UNAVAILABLE: "Monitoring unavailable",
};

const PROBLEM_CATEGORY_LABEL_TO_VALUE: Record<string, string> = Object.fromEntries(
  Object.entries(PROBLEM_CATEGORY_LABELS).map(([value, label]) => [label, value]),
);

export type ProblemsFilters = {
  /** Exact match against event.status. Real values are "ACTIVE" and "CLOSED" (not "OPEN"). */
  status?: string;
  /** Case-insensitive substring match against event.name. */
  nameContains?: string;
  /** Case-insensitive substring match against display_id, e.g. "P-26085137". */
  displayIdContains?: string;
  /** A label from PROBLEM_CATEGORY_LABELS (e.g. "Resource contention"), translated to its raw event.category value. */
  category?: string;
  /** Exact match against event.severity (1-4). Ignored if not a finite integer. */
  severity?: number;
};

/** Ceiling for both this query's own DQL `limit` and `useDql`'s `maxResultRecords` (see ENTITY_ROSTER_MAX_RESULT_RECORDS) — kept as one constant so the two can never drift apart. */
const PROBLEMS_LIMIT = 10000;
export const PROBLEMS_MAX_RESULT_RECORDS = PROBLEMS_LIMIT;

/**
 * Davis problems for the effort leaderboard. Keeps entity_tags and any dynamic owner-enrichment
 * fields (e.g. "astroshop.org/owner") intact for client-side owner resolution — only the large
 * free-text description is dropped. affected_entity_ids is overwritten with its Smartscape
 * equivalent so it lines up with the Smartscape-sourced entity roster (see buildEntityRosterQuery)
 * for override matching; entity_tags has no Smartscape replacement and stays classic.
 */
export function buildProblemsQuery(timeframe: DqlTimeframe, filters?: ProblemsFilters): string {
  const conditions: string[] = [];
  if (filters?.status) {
    conditions.push(`event.status == "${sanitizeForDqlLiteral(filters.status)}"`);
  }
  if (filters?.nameContains) {
    conditions.push(`contains(event.name, "${sanitizeForDqlLiteral(filters.nameContains)}", caseSensitive: false)`);
  }
  if (filters?.displayIdContains) {
    conditions.push(
      `contains(display_id, "${sanitizeForDqlLiteral(filters.displayIdContains)}", caseSensitive: false)`,
    );
  }
  if (filters?.category) {
    const rawCategory = PROBLEM_CATEGORY_LABEL_TO_VALUE[filters.category] ?? filters.category;
    conditions.push(`event.category == "${sanitizeForDqlLiteral(rawCategory)}"`);
  }
  if (filters?.severity !== undefined && Number.isInteger(filters.severity)) {
    conditions.push(`event.severity == ${filters.severity}`);
  }
  const filterClause = conditions.length > 0 ? `\n| filter ${conditions.join(" and ")}` : "";

  return `fetch dt.davis.problems, from: ${timeframe.from}, to: ${timeframe.to}
| fieldsAdd duration_min = resolved_problem_duration / 1m
| fieldsAdd affected_entity_ids = smartscape.affected_entity.ids
| fieldsAdd constituent_event_ids = dt.davis.event_ids${filterClause}
| fieldsRemove event.description
| sort event.start desc
| limit ${PROBLEMS_LIMIT}`;
}

/** Ceiling for both this query's own DQL `limit` and `useDql`'s `maxResultRecords` (see ENTITY_ROSTER_MAX_RESULT_RECORDS) — kept as one constant so the two can never drift apart. */
const AUTOMATIONS_LIMIT = 10000;
export const AUTOMATIONS_MAX_RESULT_RECORDS = AUTOMATIONS_LIMIT;

/**
 * Distinct (triggering event, workflow) pairs for finalized Automation Engine workflow executions
 * in the given window. A problem's "Automations Triggered" count is the number of distinct
 * workflows triggered by either the problem's own event.id or any of its constituent
 * dt.davis.event_ids — since that's a many-to-many match DQL's `lookup` can't express in one join,
 * it's computed client-side (see lib/effort.ts's buildAutomationsByEventId) from this flat list.
 * `to` is padded by 2h since a workflow can execute shortly after a problem's own event window closes.
 */
export function buildAutomationsQuery(timeframe: DqlTimeframe): string {
  return `fetch dt.system.events, from: ${timeframe.from}, to: toTimestamp(${timeframe.to})+2h
| filter event.provider == "AUTOMATION_ENGINE"
| filter event.type == "WORKFLOW_EXECUTION"
| filter dt.automation_engine.workflow_execution.trigger.type == "Event"
| filter dt.automation_engine.is_draft == false
| filter dt.automation_engine.state.is_final == true
| fields trigger_event_id = dt.automation_engine.workflow_execution.trigger.event.id, workflow_id = dt.automation_engine.workflow.id
| dedup trigger_event_id, workflow_id
| limit ${AUTOMATIONS_LIMIT}`;
}

/** Ceiling for both this query's own DQL `limit` and `useDql`'s `maxResultRecords` (see ENTITY_ROSTER_MAX_RESULT_RECORDS) — kept as one constant so the two can never drift apart. */
const PROBLEM_COMMENTS_LIMIT = 10000;
export const PROBLEM_COMMENTS_MAX_RESULT_RECORDS = PROBLEM_COMMENTS_LIMIT;

/**
 * Distinct (problem event ID, annotation ID) pairs for comments/annotations added to Davis
 * problems in the given window — confirmed via a live tenant query against
 * dt.davis.events.snapshots (event.provider == "PROBLEM_APP", event.type == "CUSTOM_ANNOTATION").
 * Each annotation is re-emitted as a snapshot across its lifecycle (e.g. CREATED, then RECOVERED
 * once finalized), so the same annotation.id appears multiple times — dedup'd here, then counted
 * per problem client-side (see the comments map builder in lib/effort.ts), mirroring how
 * buildAutomationsQuery above is paired with its own client-side map builder for workflow
 * executions.
 * annotation.problem_ids is expanded since one annotation can be linked to more than one (merged)
 * problem. `added_at` (the annotation's own event.start) is kept so callers can build a
 * comment-activity trend independent of the underlying problem's own start time.
 */
export function buildProblemCommentsQuery(timeframe: DqlTimeframe): string {
  return `fetch dt.davis.events.snapshots, from: ${timeframe.from}, to: toTimestamp(${timeframe.to})+2h
| filter event.provider == "PROBLEM_APP"
| filter event.type == "CUSTOM_ANNOTATION"
| fields problem_event_id = annotation.problem_ids, annotation_id = annotation.id, added_at = event.start
| expand problem_event_id
| dedup problem_event_id, annotation_id
| limit ${PROBLEM_COMMENTS_LIMIT}`;
}
