import { OwnershipOverride } from "./types";

/**
 * Shared row format for both entity-team lookup files (the sparse, human-edited overrides file
 * and the dense, machine-regenerated assignments export) — same four columns, same DPL pattern.
 * Used by both browser code (lib/useOwnershipRegistry.ts) and the server-side
 * api/regenerate-entity-team-assignments.function.ts, so the two never drift apart.
 */
export const LOOKUP_FIELD = "entity_id";
const FIELD_DELIMITER = "\t";
export const OWNERSHIP_ROW_PARSE_PATTERN = `LD:entity_id '${FIELD_DELIMITER}' LD:entity_name '${FIELD_DELIMITER}' LD:entity_type '${FIELD_DELIMITER}' LD:team_id`;

/**
 * DQL raises this specific errorType (rather than returning empty results) when the file
 * referenced by `load "path"` hasn't been created yet — expected on first run in a fresh
 * tenant, so callers treat it as an empty file rather than a real error.
 */
export function isMissingLookupFileError(error: unknown): boolean {
  const details = (error as { body?: { error?: { details?: { errorType?: string } } } })?.body?.error?.details;
  return details?.errorType === "UNKNOWN_TABULAR_FILE";
}

/** LD tokens split on the first occurrence of the delimiter with no quoting support, so any
 * stray delimiter/newline characters in a field's own value would desync the columns. Tabs and
 * newlines are vanishingly unlikely in entity names/ids/team ids, so it's simplest to just strip
 * them rather than take on quoted-field parsing. */
function sanitizeField(value: string): string {
  return value.replace(/[\t\r\n]/g, " ").trim();
}

export function parseOwnershipRows(records: Record<string, unknown>[]): OwnershipOverride[] {
  const byEntityId = new Map<string, OwnershipOverride>();
  for (const record of records) {
    const entityId = ((record.entity_id as string | undefined) ?? "").trim();
    const teamId = ((record.team_id as string | undefined) ?? "").trim();
    if (!entityId || !teamId) continue;
    byEntityId.set(entityId, {
      entityId,
      entityName: (record.entity_name as string | undefined) ?? "",
      entityType: ((record.entity_type as string | undefined) ?? "") as OwnershipOverride["entityType"],
      teamId,
    });
  }
  return Array.from(byEntityId.values());
}

export function serializeOwnershipRows(rows: OwnershipOverride[]): string {
  return rows
    .map((o) => [o.entityId, o.entityName, o.entityType, o.teamId].map(sanitizeField).join(FIELD_DELIMITER))
    .join("\n");
}
