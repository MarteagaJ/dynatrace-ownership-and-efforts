import { resolveEntityTeamId, resolveProblemTeamId } from "./ownershipTags";
import { PROBLEM_CATEGORY_LABELS } from "./queries";
import { Team } from "./teams";
import { EntitySummary, OwnershipRegistry, ProblemRecord, TeamId, TeamStats, UNASSIGNED_TEAM_ID } from "./types";

function teamDisplayName(teamId: TeamId, teams: Team[]): string {
  if (teamId === UNASSIGNED_TEAM_ID) return "Unassigned";
  return teams.find((t) => t.identifier === teamId)?.name ?? teamId;
}

/**
 * Maps a triggering event.id (from either a problem or one of its constituent Davis events) to
 * the set of distinct workflow IDs it triggered. Built once per fetch of buildAutomationsQuery's
 * results (see lib/queries.ts) and reused across every problem row.
 */
export function buildAutomationsByEventId(rawAutomationRows: Record<string, unknown>[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of rawAutomationRows) {
    const eventId = row.trigger_event_id as string | undefined;
    const workflowId = row.workflow_id as string | undefined;
    if (!eventId || !workflowId) continue;
    const workflowIds = map.get(eventId) ?? new Set<string>();
    workflowIds.add(workflowId);
    map.set(eventId, workflowIds);
  }
  return map;
}

function countAutomationsTriggered(
  eventId: string,
  constituentEventIds: string[],
  automationsByEventId: Map<string, Set<string>>,
): number {
  const triggeredWorkflowIds = new Set<string>();
  for (const id of [eventId, ...constituentEventIds]) {
    const workflowIds = automationsByEventId.get(id);
    if (!workflowIds) continue;
    for (const workflowId of workflowIds) triggeredWorkflowIds.add(workflowId);
  }
  return triggeredWorkflowIds.size;
}

/**
 * Maps a Davis problem event ID (from either the problem itself or one of its constituent
 * events) to the set of distinct annotation IDs (comments) attached to it. Built once per fetch
 * of the problem comments query's results (see buildProblemCommentsQuery in lib/queries.ts) and
 * reused across every problem row, mirroring how the automations map above handles workflow
 * executions.
 */
export function buildCommentsByProblemEventId(rawCommentRows: Record<string, unknown>[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of rawCommentRows) {
    const problemEventId = row.problem_event_id as string | undefined;
    const annotationId = row.annotation_id as string | undefined;
    if (!problemEventId || !annotationId) continue;
    const annotationIds = map.get(problemEventId) ?? new Set<string>();
    annotationIds.add(annotationId);
    map.set(problemEventId, annotationIds);
  }
  return map;
}

function countCommentsAdded(
  eventId: string,
  constituentEventIds: string[],
  commentsByEventId: Map<string, Set<string>>,
): number {
  const annotationIds = new Set<string>();
  for (const id of [eventId, ...constituentEventIds]) {
    const ids = commentsByEventId.get(id);
    if (!ids) continue;
    for (const annotationId of ids) annotationIds.add(annotationId);
  }
  return annotationIds.size;
}

export function toProblemRecord(
  raw: Record<string, unknown>,
  registry: OwnershipRegistry,
  automationsByEventId: Map<string, Set<string>>,
  commentsByEventId: Map<string, Set<string>>,
): ProblemRecord {
  const rawCategory = raw["event.category"] as string | undefined;
  const eventId = raw["event.id"] as string;
  const constituentEventIds = (raw.constituent_event_ids as string[]) ?? [];
  return {
    displayId: raw.display_id as string,
    eventId,
    constituentEventIds,
    name: raw["event.name"] as string,
    status: raw["event.status"] as string,
    severity: Number(raw["event.severity"] ?? 0),
    category: (rawCategory && PROBLEM_CATEGORY_LABELS[rawCategory]) ?? rawCategory ?? "—",
    rootCauseEntityName: (raw.root_cause_entity_name as string) || undefined,
    start: raw["event.start"] as string,
    end: raw["event.end"] as string | undefined,
    durationMinutes: typeof raw.duration_min === "number" ? raw.duration_min : undefined,
    isFrequentEvent: Boolean(raw["dt.davis.is_frequent_event"]),
    isDuplicate: Boolean(raw["dt.davis.is_duplicate"]),
    affectedEntityIds: (raw.affected_entity_ids as string[]) ?? [],
    affectedEntityNames: (raw.affected_entity_names as string[]) ?? [],
    resolvedTeamId: resolveProblemTeamId(raw, registry.overrides),
    automationsTriggered: countAutomationsTriggered(eventId, constituentEventIds, automationsByEventId),
    commentsAdded: countCommentsAdded(eventId, constituentEventIds, commentsByEventId),
  };
}

export function resolveEntities(
  entities: EntitySummary[],
  registry: OwnershipRegistry,
): EntitySummary[] {
  return entities.map((entity) => ({
    ...entity,
    detectedTeamId: resolveEntityTeamId(entity.id, entity.tags, registry.overrides),
  }));
}

export function computeTeamStats(
  problems: ProblemRecord[],
  entities: EntitySummary[],
  teams: Team[],
): TeamStats[] {
  const entityCountByTeam = new Map<TeamId, number>();
  for (const entity of entities) {
    const teamId = entity.detectedTeamId ?? UNASSIGNED_TEAM_ID;
    entityCountByTeam.set(teamId, (entityCountByTeam.get(teamId) ?? 0) + 1);
  }

  const statsByTeam = new Map<TeamId, TeamStats>();

  const getOrCreate = (teamId: TeamId): TeamStats => {
    let stats = statsByTeam.get(teamId);
    if (!stats) {
      stats = {
        teamId,
        displayName: teamDisplayName(teamId, teams),
        totalProblems: 0,
        openProblems: 0,
        closedProblems: 0,
        avgMttrMinutes: undefined,
        noiseCount: 0,
        entityCount: entityCountByTeam.get(teamId) ?? 0,
      };
      statsByTeam.set(teamId, stats);
    }
    return stats;
  };

  // Every known team appears in the leaderboard even with zero problems in the timeframe.
  for (const team of teams) {
    getOrCreate(team.identifier);
  }
  for (const teamId of entityCountByTeam.keys()) {
    getOrCreate(teamId);
  }

  const closedDurationsByTeam = new Map<TeamId, number[]>();

  for (const problem of problems) {
    const stats = getOrCreate(problem.resolvedTeamId);
    stats.totalProblems += 1;
    if (problem.status === "CLOSED") {
      stats.closedProblems += 1;
      if (typeof problem.durationMinutes === "number") {
        const durations = closedDurationsByTeam.get(problem.resolvedTeamId) ?? [];
        durations.push(problem.durationMinutes);
        closedDurationsByTeam.set(problem.resolvedTeamId, durations);
      }
    } else {
      stats.openProblems += 1;
    }
    if (problem.isFrequentEvent || problem.isDuplicate) {
      stats.noiseCount += 1;
    }
  }

  for (const [teamId, durations] of closedDurationsByTeam) {
    const stats = getOrCreate(teamId);
    stats.avgMttrMinutes = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  return Array.from(statsByTeam.values()).sort((a, b) => b.totalProblems - a.totalProblems);
}
