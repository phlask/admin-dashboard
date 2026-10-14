/**
 * Helpers for deciding whether a proposed resource value differs from the
 * current one, for the review page's "changed fields" highlighting.
 *
 * Edits are full snapshots, so most fields are identical; what matters is
 * telling real changes apart from representation noise:
 * - null, undefined, "", [] and {} (recursively) all mean "no value"
 * - arrays of primitives (tags, dispenser types) are compared as sets
 * - object key order is irrelevant
 * Numbers are compared exactly — a coordinate nudge is a real change.
 */

const isEmpty = (value: unknown) => value === undefined;

export const normalizeForCompare = (value: unknown): unknown => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? undefined : value;
  }

  if (Array.isArray(value)) {
    const items = value
      .map(normalizeForCompare)
      .filter((item) => !isEmpty(item));
    if (items.length === 0) {
      return undefined;
    }
    const allPrimitive = items.every((item) => typeof item !== "object");
    return allPrimitive
      ? [...items].sort((a, b) => String(a).localeCompare(String(b)))
      : items;
  }

  if (typeof value === "object") {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          [
            key,
            normalizeForCompare((value as Record<string, unknown>)[key]),
          ] as const,
      )
      .filter(([, item]) => !isEmpty(item));
    return entries.length === 0 ? undefined : Object.fromEntries(entries);
  }

  return value;
};

export const valuesDiffer = (current: unknown, proposed: unknown) =>
  JSON.stringify(normalizeForCompare(current)) !==
  JSON.stringify(normalizeForCompare(proposed));
