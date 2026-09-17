import { useCallback, useMemo, useState } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { lookupDataClient } from "@dynatrace-sdk/client-resource-store";
import { PlatformBinary } from "@dynatrace-sdk/http-client";
import { EMPTY_REGISTRY, OwnershipOverride, OwnershipRegistry } from "./types";
import { buildOwnershipOverridesQuery, ENTITY_ROSTER_MAX_RESULT_RECORDS, OWNERSHIP_OVERRIDES_FILE_PATH } from "./queries";
import {
  isMissingLookupFileError,
  LOOKUP_FIELD,
  OWNERSHIP_ROW_PARSE_PATTERN,
  parseOwnershipRows,
  serializeOwnershipRows,
} from "./lookupFileFormat";

/** Order-independent equality check for two override sets, used to detect whether the lookup
 * file changed (e.g. someone else saved) between when this editor last synced and when it's
 * about to overwrite the whole file. */
function overridesEqual(a: OwnershipOverride[], b: OwnershipOverride[]): boolean {
  if (a.length !== b.length) return false;
  const bByEntityId = new Map(b.map((o) => [o.entityId, o.teamId]));
  return a.every((o) => bByEntityId.get(o.entityId) === o.teamId);
}

async function uploadOverrides(overrides: OwnershipOverride[]): Promise<void> {
  await lookupDataClient.upload({
    body: {
      content: PlatformBinary.fromText(serializeOwnershipRows(overrides)),
      request: {
        filePath: OWNERSHIP_OVERRIDES_FILE_PATH,
        parsePattern: OWNERSHIP_ROW_PARSE_PATTERN,
        lookupField: LOOKUP_FIELD,
        overwrite: true,
        displayName: "Ownership & Efforts - entity/team overrides",
        description:
          "Manual entity-to-team ownership overrides for the Ownership & Efforts app. Managed via the app's Entities page.",
      },
    },
  });
}

/**
 * The shared ownership-overrides lookup file is the single source of truth for manual
 * entity-to-team assignment across the whole app (replacing the old per-app document store) —
 * tag/metadata auto-detect (lib/ownershipTags.ts) only kicks in for entities with no row here.
 * Being a lookup file also means it can be joined directly in DQL (`lookup` command) elsewhere,
 * not just read client-side like the old document was.
 *
 * This is intentionally kept separate from ENTITY_TEAM_ASSIGNMENTS_FILE_PATH, the dense,
 * hourly-regenerated export for external consumers (see
 * api/regenerate-entity-team-assignments.function.ts) — this file is the sparse, human-edited
 * source of intent; that one is a derived, machine-written cache. Keeping them apart means the
 * hourly regeneration job never races this hook's save flow.
 */
export function useOwnershipRegistry() {
  const query = useMemo(() => buildOwnershipOverridesQuery(), []);
  // Overrides can cover up to every known entity, so reuse the same ceiling as the entity roster
  // itself — `maxResultRecords` defaults to 1000 regardless of file size otherwise.
  const { data, error: readError, isPending, forceRefetch } = useDql({
    query,
    maxResultRecords: ENTITY_ROSTER_MAX_RESULT_RECORDS,
  });

  const fileMissing = isMissingLookupFileError(readError);
  const records = useMemo(() => (data?.records ?? []) as Record<string, unknown>[], [data]);
  const registry: OwnershipRegistry = useMemo(
    () => (fileMissing ? EMPTY_REGISTRY : { overrides: parseOwnershipRows(records) }),
    [fileMissing, records],
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error>();

  const save = useCallback(
    async (next: OwnershipRegistry) => {
      setIsSaving(true);
      setSaveError(undefined);
      try {
        // lookup:upload always replaces the whole file (no partial/append writes, and no
        // version/ETag-based conditional write like the old document store had), so re-check
        // the live file immediately before overwriting it — if it changed since this editor
        // last synced, someone else saved in the meantime and blindly overwriting would
        // silently discard their change.
        const fresh = await forceRefetch();
        const freshMissing = isMissingLookupFileError(fresh.error);
        const freshOverrides = freshMissing ? [] : parseOwnershipRows(fresh.data?.records ?? []);
        if (!overridesEqual(freshOverrides, registry.overrides)) {
          throw new Error(
            "Someone else changed the ownership overrides since this page loaded. Refresh and reapply your changes.",
          );
        }

        await uploadOverrides(next.overrides);
        await forceRefetch();
      } catch (error) {
        setSaveError(error as Error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [forceRefetch, registry],
  );

  return {
    registry,
    isLoading: isPending,
    isSaving,
    error: fileMissing ? undefined : (saveError ?? readError),
    save,
  };
}
