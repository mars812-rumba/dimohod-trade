export type VariantSelection = Record<string, string | null | undefined>;

export function filterVariantItems<T>(
  items: T[],
  selection: VariantSelection,
  valueOf: (item: T, key: string) => string | null,
) {
  const selectedEntries = Object.entries(selection).filter(([, value]) => Boolean(value));
  return items.filter((item) =>
    selectedEntries.every(([key, value]) => valueOf(item, key) === value),
  );
}

export function variantValueAvailable<T, K extends string>(
  items: T[],
  current: T,
  targetKey: K,
  targetValue: string,
  requiredKeys: K[],
  valueOf: (item: T, key: K) => string | null,
) {
  return items.some(
    (item) =>
      valueOf(item, targetKey) === targetValue &&
      requiredKeys.every((key) => valueOf(item, key) === valueOf(current, key)),
  );
}

export function selectVariantCandidate<T, K extends string>({
  items,
  current,
  targetKey,
  targetValue,
  requiredKeys,
  priorityKeys,
  valueOf,
  stableKey,
}: {
  items: T[];
  current: T;
  targetKey: K;
  targetValue: string;
  requiredKeys: K[];
  priorityKeys: K[];
  valueOf: (item: T, key: K) => string | null;
  stableKey: (item: T) => string;
}) {
  const candidates = items.filter(
    (item) =>
      valueOf(item, targetKey) === targetValue &&
      requiredKeys.every((key) => valueOf(item, key) === valueOf(current, key)),
  );
  return candidates.sort((left, right) => {
    for (const key of priorityKeys) {
      if (key === targetKey) continue;
      const leftMatches = valueOf(left, key) === valueOf(current, key);
      const rightMatches = valueOf(right, key) === valueOf(current, key);
      if (leftMatches !== rightMatches) {
        return leftMatches ? -1 : 1;
      }
    }
    return stableKey(left).localeCompare(stableKey(right), "ru", { numeric: true });
  })[0];
}
