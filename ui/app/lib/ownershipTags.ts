import { OwnershipOverride, TeamId, UNASSIGNED_TEAM_ID } from "./types";

const OWNER_KEY_PATTERN = /owner|team/i;

/**
 * Tag conventions vary a lot per tenant/cloud provider (dt.owner, [Azure]dt_owner_team,
 * astroshop.org/owner, ...). Rather than hardcode one key, treat any tag whose key
 * contains "owner" or "team" as an ownership signal, stripping bracketed provider
 * prefixes like "[Azure]" first.
 */
export function findOwnerTag(tags: string[]): TeamId | undefined {
  for (const tag of tags) {
    const separatorIndex = tag.indexOf(":");
    if (separatorIndex === -1) continue;
    const rawKey = tag.slice(0, separatorIndex);
    const value = tag.slice(separatorIndex + 1).trim();
    const key = rawKey.replace(/^\[[^\]]*\]/, "").trim();
    if (value && OWNER_KEY_PATTERN.test(key)) {
      return value;
    }
  }
  return undefined;
}

/**
 * Some Davis problems carry owner attribution as a dynamic top-level field
 * (e.g. "astroshop.org/owner") added by an OpenPipeline enrichment, rather than
 * inside entity_tags. Scan the record's own keys for the same owner/team pattern.
 */
export function findOwnerField(record: Record<string, unknown>): TeamId | undefined {
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string" && value && OWNER_KEY_PATTERN.test(key)) {
      return value;
    }
  }
  return undefined;
}

export function findOverrideForEntities(
  entityIds: string[],
  overrides: OwnershipOverride[],
): TeamId | undefined {
  for (const entityId of entityIds) {
    const match = overrides.find((o) => o.entityId === entityId);
    if (match) return match.teamId;
  }
  return undefined;
}

export function resolveProblemTeamId(
  record: Record<string, unknown>,
  overrides: OwnershipOverride[],
): TeamId {
  const affectedEntityIds = (record.affected_entity_ids as string[]) ?? [];

  const override = findOverrideForEntities(affectedEntityIds, overrides);
  if (override) return override;

  const fieldOwner = findOwnerField(record);
  if (fieldOwner) return fieldOwner;

  const entityTags = (record.entity_tags as string[]) ?? [];
  const tagOwner = findOwnerTag(entityTags);
  if (tagOwner) return tagOwner;

  return UNASSIGNED_TEAM_ID;
}

export function resolveEntityTeamId(
  entityId: string,
  tags: string[],
  overrides: OwnershipOverride[],
): TeamId {
  const override = overrides.find((o) => o.entityId === entityId);
  if (override) return override.teamId;
  return findOwnerTag(tags) ?? UNASSIGNED_TEAM_ID;
}
