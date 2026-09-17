/**
 * Confirmed live against a real tenant: cost allocation is carried as ordinary tags, not a
 * dedicated field — e.g. "[Environment]dt.cost.costcenter:research-and-development/RnD" and
 * "[Environment]dt.cost.product:easytravel-AWS". Mirrors lib/ownershipTags.ts's approach of
 * matching by key substring rather than an exact key, since the bracketed provider prefix
 * ("[Environment]", "[Azure]", ...) varies.
 */
function findTagValue(tags: string[], keyPattern: RegExp): string | undefined {
  for (const tag of tags) {
    const separatorIndex = tag.indexOf(":");
    if (separatorIndex === -1) continue;
    const rawKey = tag.slice(0, separatorIndex);
    const value = tag.slice(separatorIndex + 1).trim();
    const key = rawKey.replace(/^\[[^\]]*\]/, "").trim();
    if (value && keyPattern.test(key)) {
      return value;
    }
  }
  return undefined;
}

export function findCostCenter(tags: string[]): string | undefined {
  return findTagValue(tags, /cost.*center/i);
}

export function findCostProduct(tags: string[]): string | undefined {
  return findTagValue(tags, /cost.*product/i);
}

/**
 * softwareTechnologies entries look like "type:JAVA,edition:AdoptOpenJDK,version:11.0.5" —
 * pull out just the "type" value (the technology name) for a readable breakdown.
 */
export function parseTechnologyName(entry: string): string | undefined {
  const match = entry.match(/^type:([^,]+)/);
  return match?.[1];
}
