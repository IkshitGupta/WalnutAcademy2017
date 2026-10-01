/**
 * Shared surface styles.
 *
 * Sections that repeat a surface draw it from here, so radius, padding and ring
 * stay identical between them rather than drifting per component.
 */

/** Panel on one of the navy bands. */
export const panelOnNavy =
  "rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 sm:p-8";

/** Section eyebrow, above the heading. */
export const eyebrow =
  "font-heading text-sm font-bold tracking-[0.14em] uppercase";

/** Heading for a group of items within a section. */
export const groupHeading =
  "font-heading text-sm font-bold tracking-[0.14em] text-navy-deep uppercase";

/** Preserves source order of both the groups and the items inside them. */
export function groupBy<T, K extends string>(
  items: readonly T[],
  key: (item: T) => K,
) {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const name = key(item);
    const existing = groups.get(name);
    if (existing) existing.push(item);
    else groups.set(name, [item]);
  }
  return [...groups].map(([name, members]) => ({ name, items: members }));
}
