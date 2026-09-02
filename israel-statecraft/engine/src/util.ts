// Date + hashing utilities. Pure, deterministic.

const DAY_MS = 86_400_000;

export function isoToDay(startIso: string, iso: string): number {
  return Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(startIso + 'T00:00:00Z')) / DAY_MS);
}

export function dayToIso(startIso: string, day: number): string {
  const d = new Date(Date.parse(startIso + 'T00:00:00Z') + Math.floor(day) * DAY_MS);
  return d.toISOString().slice(0, 10);
}

/** FNV-1a 32-bit over a string; returns unsigned int. */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Stable JSON stringify (sorted keys) for hashing. */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  const o = v as Record<string, unknown>;
  return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + stableStringify(o[k])).join(',') + '}';
}

export function clamp(x: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, x));
}

export function uid(prefix: string, n: number): string {
  return `${prefix}_${n.toString(36)}`;
}
