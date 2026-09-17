import { queryExecutionClient } from "@dynatrace-sdk/client-query";
import { lookupDataClient } from "@dynatrace-sdk/client-resource-store";
import { PlatformBinary } from "@dynatrace-sdk/http-client";
import { toEntitySummary } from "../ui/app/lib/entities";
import {
  isMissingLookupFileError,
  LOOKUP_FIELD,
  OWNERSHIP_ROW_PARSE_PATTERN,
  parseOwnershipRows,
  serializeOwnershipRows,
} from "../ui/app/lib/lookupFileFormat";
import { resolveEntityTeamId } from "../ui/app/lib/ownershipTags";
import {
  buildEntityRosterQuery,
  buildOwnershipOverridesQuery,
  ENTITY_TEAM_ASSIGNMENTS_FILE_PATH,
} from "../ui/app/lib/queries";
import { OwnershipOverride, UNASSIGNED_TEAM_ID } from "../ui/app/lib/types";

const POLL_INTERVAL_MS = 300;

/**
 * High enough that no realistic tenant has more of a single entity kind than this — the UI's own
 * roster query now shares this same per-kind cap (see DEFAULT_ROSTER_LIMIT_PER_KIND in
 * lib/queries.ts), since this export's whole point is to be a complete, authoritative answer for
 * any entity a workflow might ask about. Grail's own per-query result ceiling still applies on
 * top of this; if a tenant's entity count ever approaches it, this needs revisiting (pagination).
 */
const ROSTER_LIMIT_PER_KIND = 5000;

/** 5 entity kinds in the roster (Host, Service, K8s deployment, Web application, Frontend). */
const ROSTER_MAX_RESULT_RECORDS = ROSTER_LIMIT_PER_KIND * 5;

/**
 * `maxResultRecords` defaults to 1000 regardless of a query's own DQL `limit` — silently
 * truncating a second time after the DQL-side limit already applied. Defaults here to that same
 * 1000 (fine for the small overrides file), but the roster call below overrides it explicitly.
 */
async function runDql(query: string, maxResultRecords = 1000): Promise<Record<string, unknown>[]> {
  // queryExecute already returns state/result directly for queries that finish immediately
  // (the common case here); only fall back to polling for ones that don't.
  let result = await queryExecutionClient.queryExecute({ body: { query, maxResultRecords } });
  while (result.state === "NOT_STARTED" || result.state === "RUNNING") {
    if (!result.requestToken) {
      throw new Error(`DQL query is ${result.state} but returned no requestToken to poll: ${query}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    result = await queryExecutionClient.queryPoll({ requestToken: result.requestToken });
  }
  if (result.state !== "SUCCEEDED") {
    throw new Error(`DQL query did not succeed (state: ${result.state}): ${query}`);
  }
  return result.result?.records ?? [];
}

/** A fresh tenant has no overrides file yet — that's an empty override set, not a failure. */
async function loadOverrides(): Promise<OwnershipOverride[]> {
  try {
    // Overrides can cover up to every known entity, so reuse the roster's own ceiling.
    return parseOwnershipRows(await runDql(buildOwnershipOverridesQuery(), ROSTER_MAX_RESULT_RECORDS));
  } catch (error) {
    if (isMissingLookupFileError(error)) return [];
    throw error;
  }
}

/**
 * Regenerates the dense entity-team-assignments lookup file — a machine-written export of every
 * entity's *resolved* team (override, else tag-based auto-detect), refreshed hourly by a scheduled
 * workflow (see the app's README/docs for the exact one-step workflow definition). Reuses the same
 * resolution rule (lib/ownershipTags.ts) as the interactive app, so this export and the live UI
 * can never disagree about how ownership is determined — only about how fresh the answer is.
 *
 * Kept as a separate file from the sparse, human-edited overrides file (lib/useOwnershipRegistry.ts)
 * so this hourly regeneration never races a human's manual-override save.
 */
export default async function () {
  const [rosterRecords, overrides] = await Promise.all([
    runDql(buildEntityRosterQuery({ limitPerKind: ROSTER_LIMIT_PER_KIND }), ROSTER_MAX_RESULT_RECORDS),
    loadOverrides(),
  ]);

  const entities = rosterRecords.map(toEntitySummary);

  const assignments: OwnershipOverride[] = [];
  for (const entity of entities) {
    const teamId = resolveEntityTeamId(entity.id, entity.tags, overrides);
    if (teamId === UNASSIGNED_TEAM_ID) continue;
    assignments.push({ entityId: entity.id, entityName: entity.name, entityType: entity.entityType, teamId });
  }

  await lookupDataClient.upload({
    body: {
      content: PlatformBinary.fromText(serializeOwnershipRows(assignments)),
      request: {
        filePath: ENTITY_TEAM_ASSIGNMENTS_FILE_PATH,
        parsePattern: OWNERSHIP_ROW_PARSE_PATTERN,
        lookupField: LOOKUP_FIELD,
        overwrite: true,
        displayName: "Ownership & Efforts - entity/team assignments",
        description:
          "Resolved team assignment for every known entity (override, else tag-based auto-detect). Regenerated hourly by a scheduled workflow - do not edit manually.",
      },
    },
  });

  return {
    entityCount: entities.length,
    assignedCount: assignments.length,
    unassignedCount: entities.length - assignments.length,
  };
}
