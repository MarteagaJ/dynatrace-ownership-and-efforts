import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { useOwnershipRegistry } from "./useOwnershipRegistry";
import { useOwnershipTeams } from "./useOwnershipTeams";
import {
  AUTOMATIONS_MAX_RESULT_RECORDS,
  buildAutomationsQuery,
  buildEntityRosterQuery,
  buildProblemCommentsQuery,
  buildProblemsQuery,
  ENTITY_ROSTER_MAX_RESULT_RECORDS,
  PROBLEM_COMMENTS_MAX_RESULT_RECORDS,
  PROBLEMS_MAX_RESULT_RECORDS,
} from "./queries";
import { toEntitySummary } from "./entities";
import {
  buildAutomationsByEventId,
  buildCommentsByProblemEventId,
  computeTeamStats,
  resolveEntities,
  toProblemRecord,
} from "./effort";
import { DEFAULT_DQL_TIMEFRAME, DqlTimeframe } from "./timeframe";

export type EffortDataFilters = {
  /** DQL-ready from/to for the problems query. Defaults to the last 30 days. */
  timeframe?: DqlTimeframe;
  /** Exact match against entity type, e.g. "Host" or "Kubernetes workload". */
  entityType?: string;
  /** Case-insensitive substring match against entity name. */
  entityNameContains?: string;
  /** Exact match against problem status, e.g. "ACTIVE" or "CLOSED". */
  problemStatus?: string;
  /** Case-insensitive substring match against problem name. */
  problemNameContains?: string;
  /** Case-insensitive substring match against the problem's display ID, e.g. "P-26085137". */
  problemDisplayIdContains?: string;
  /** A label from PROBLEM_CATEGORY_LABELS, e.g. "Resource contention". */
  problemCategory?: string;
  /** Exact match against problem severity (1-4). */
  problemSeverity?: number;
};

/**
 * Central data hook: fetches entities + problems, resolves ownership, and aggregates team stats.
 * Optional `filters` are pushed down into the DQL queries themselves (not applied client-side),
 * so callers like TeamDetail's timeframe selector and filter bars narrow the actual data fetched
 * from Grail.
 */
export function useEffortData(filters?: EffortDataFilters) {
  const {
    registry,
    isLoading: isRegistryLoading,
    isSaving,
    error: registryError,
    save: saveRegistry,
  } = useOwnershipRegistry();

  const { teams, isLoading: isTeamsLoading, error: teamsError } = useOwnershipTeams();

  const entityRosterQuery = useMemo(
    () => buildEntityRosterQuery({ entityType: filters?.entityType, nameContains: filters?.entityNameContains }),
    [filters?.entityType, filters?.entityNameContains],
  );
  const { from: timeframeFrom, to: timeframeTo } = filters?.timeframe ?? DEFAULT_DQL_TIMEFRAME;
  const problemsQueryString = useMemo(
    () =>
      buildProblemsQuery(
        { from: timeframeFrom, to: timeframeTo },
        {
          status: filters?.problemStatus,
          nameContains: filters?.problemNameContains,
          displayIdContains: filters?.problemDisplayIdContains,
          category: filters?.problemCategory,
          severity: filters?.problemSeverity,
        },
      ),
    [
      timeframeFrom,
      timeframeTo,
      filters?.problemStatus,
      filters?.problemNameContains,
      filters?.problemDisplayIdContains,
      filters?.problemCategory,
      filters?.problemSeverity,
    ],
  );

  const automationsQueryString = useMemo(
    () => buildAutomationsQuery({ from: timeframeFrom, to: timeframeTo }),
    [timeframeFrom, timeframeTo],
  );

  const commentsQueryString = useMemo(
    () => buildProblemCommentsQuery({ from: timeframeFrom, to: timeframeTo }),
    [timeframeFrom, timeframeTo],
  );

  // `maxResultRecords` defaults to 1000 regardless of a query's own DQL `limit`, so it must be
  // raised to match — otherwise the platform silently truncates a second time after the DQL-side
  // limit already applied, undermining the exact counts/trends every chart and table depends on.
  const entitiesQuery = useDql({ query: entityRosterQuery, maxResultRecords: ENTITY_ROSTER_MAX_RESULT_RECORDS });
  const problemsQuery = useDql({ query: problemsQueryString, maxResultRecords: PROBLEMS_MAX_RESULT_RECORDS });
  const automationsQuery = useDql({ query: automationsQueryString, maxResultRecords: AUTOMATIONS_MAX_RESULT_RECORDS });
  const commentsQuery = useDql({ query: commentsQueryString, maxResultRecords: PROBLEM_COMMENTS_MAX_RESULT_RECORDS });

  const entities = useMemo(() => {
    const raw = (entitiesQuery.data?.records ?? []) as Record<string, unknown>[];
    return resolveEntities(raw.map(toEntitySummary), registry);
  }, [entitiesQuery.data, registry]);

  const automationsByEventId = useMemo(
    () => buildAutomationsByEventId((automationsQuery.data?.records ?? []) as Record<string, unknown>[]),
    [automationsQuery.data],
  );

  const commentRows = useMemo(
    () => (commentsQuery.data?.records ?? []) as Record<string, unknown>[],
    [commentsQuery.data],
  );

  const commentsByEventId = useMemo(() => buildCommentsByProblemEventId(commentRows), [commentRows]);

  /** Flat (problem event ID, timestamp) pairs for every comment, e.g. for a "comments over time" trend. */
  const commentEvents = useMemo(
    () =>
      commentRows
        .map((row) => ({
          problemEventId: row.problem_event_id as string | undefined,
          timestamp: row.added_at as string | undefined,
        }))
        .filter(
          (row): row is { problemEventId: string; timestamp: string } =>
            row.problemEventId !== undefined && row.timestamp !== undefined,
        ),
    [commentRows],
  );

  const problems = useMemo(() => {
    const raw = (problemsQuery.data?.records ?? []) as Record<string, unknown>[];
    return raw.map((record) => toProblemRecord(record, registry, automationsByEventId, commentsByEventId));
  }, [problemsQuery.data, registry, automationsByEventId, commentsByEventId]);

  const teamStats = useMemo(
    () => computeTeamStats(problems, entities, teams),
    [problems, entities, teams],
  );

  return {
    registry,
    saveRegistry,
    teams,
    entities,
    problems,
    commentEvents,
    teamStats,
    /** The exact DQL text behind `entities`/`problems`/`automations`/`comments`, for "Show query" UI. */
    queries: {
      entityRoster: entityRosterQuery,
      problems: problemsQueryString,
      automations: automationsQueryString,
      comments: commentsQueryString,
    },
    isLoading:
      isRegistryLoading ||
      isTeamsLoading ||
      entitiesQuery.isLoading ||
      problemsQuery.isLoading ||
      automationsQuery.isLoading ||
      commentsQuery.isLoading,
    isSaving,
    error:
      registryError ?? teamsError ?? entitiesQuery.error ?? problemsQuery.error ?? automationsQuery.error ?? commentsQuery.error,
  };
}
