import type { FilterFieldTree } from "@dynatrace/strato-components/filters";

/** Walks the flat top-level statements of a filter tree into a simple key -> value map. */
export function extractSimpleFilters(tree: FilterFieldTree): Record<string, string> {
  const result: Record<string, string> = {};
  if (!tree) return result;
  for (const node of tree.children) {
    if (node.type !== "Statement") continue;
    const key = node.key?.value;
    const value = node.value;
    if (!key || !value || value.type === "List") continue;
    if (typeof value.value === "string") {
      result[key] = value.value;
    }
  }
  return result;
}
