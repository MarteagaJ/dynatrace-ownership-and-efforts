/** A team identity is just the string we resolved as "owner" — from a tag value or a manual override. */
export type TeamId = string;

export type EntityKind = "Host" | "Service" | "Kubernetes deployment" | "Web application" | "Frontend";

export type EntitySummary = {
  id: string;
  name: string;
  entityType: EntityKind;
  /** Raw tag strings looked up from the classic entity table, e.g. "dt.owner:platform-team". */
  tags: string[];
  /** Native Smartscape node type, e.g. "K8S_DEPLOYMENT". Only needed for the intent payload. */
  smartscapeType?: string;
  /** Smartscape node lifetime window. */
  lifetime?: { start: string; end: string };
  /** Smartscape node's dt.security_context. Usually empty. */
  securityContext: string[];
  /**
   * Raw softwareTechnologies entries from the classic entity table, e.g.
   * "type:JAVA,edition:AdoptOpenJDK,version:11.0.5". Only populated for Host/Service — the other
   * classic entity tables (cloud_application, application) don't have this field at all.
   */
  softwareTechnologies: string[];
  /**
   * Classic dt.entity.* ID bridged from this Smartscape node via id_classic, e.g.
   * "APPLICATION-ABCD1234". Only used for the "dt-entity" intent shape (see lib/entities.ts),
   * whose payload key (e.g. dt.entity.application) is itself a classic entity type and requires
   * a classic-format ID — the Smartscape node ID is a different, incompatible format.
   */
  classicEntityId?: string;
  /** Owner detected from tags, before any manual override is applied. */
  detectedTeamId?: TeamId;
};

/**
 * Manual assignment of an entity to a team, stored as a row in the shared ownership-overrides
 * lookup file (see lib/useOwnershipRegistry.ts). This is now the primary signal for team
 * resolution — tag/metadata-based auto-detect (lib/ownershipTags.ts) only applies to entities
 * with no row here.
 */
export type OwnershipOverride = {
  entityId: string;
  entityName: string;
  entityType: EntityKind;
  teamId: TeamId;
};

/**
 * The team catalog itself lives in Dynatrace's native Settings object
 * (builtin:ownership.teams, see lib/teams.ts) — this registry only tracks the app-specific
 * overlay of manual entity-to-team overrides.
 */
export type OwnershipRegistry = {
  overrides: OwnershipOverride[];
};

export const EMPTY_REGISTRY: OwnershipRegistry = { overrides: [] };

export const UNASSIGNED_TEAM_ID = "__unassigned__";

/**
 * Display-only cap on DataTable rows, so large result sets stay easy to scroll and don't strain
 * table rendering. Only applies to what's rendered in a table — tile/summary counts (e.g.
 * TeamStats, StatTile values) are always computed from the full underlying dataset, never from
 * a table's truncated slice.
 */
export const MAX_TABLE_ROWS = 1000;

export type ProblemRecord = {
  displayId: string;
  /** dt.davis.problems' own event.id — the identifier the platform's "view-problem" intent expects. */
  eventId: string;
  /** Distinct dt.davis.event_ids merged into this problem — automations/comments may be attributed to any of these instead of eventId. */
  constituentEventIds: string[];
  name: string;
  status: string;
  severity: number;
  /** Display label from PROBLEM_CATEGORY_LABELS, e.g. "Resource contention". */
  category: string;
  /** dt.davis.problems' root_cause_entity_name. Undefined when Davis didn't detect a root cause. */
  rootCauseEntityName?: string;
  start: string;
  end?: string;
  durationMinutes?: number;
  isFrequentEvent: boolean;
  isDuplicate: boolean;
  affectedEntityIds: string[];
  affectedEntityNames: string[];
  resolvedTeamId: TeamId;
  /** Distinct automation workflows triggered by this problem's event or any of its constituent events. */
  automationsTriggered: number;
  /** Distinct comments/annotations added to this problem's event or any of its constituent events. */
  commentsAdded: number;
};

export type TeamStats = {
  teamId: TeamId;
  displayName: string;
  totalProblems: number;
  openProblems: number;
  closedProblems: number;
  avgMttrMinutes: number | undefined;
  noiseCount: number;
  entityCount: number;
};
