// Deterministic named-draw random service.
// Every uncertain execution point requests a named draw; the draw is recorded
// for replay. Replay mode injects recorded values and never re-rolls.

import { fnv1a } from './util.js';

export interface DrawRecord {
  name: string;
  lineage: string; // seed:name:counter
  kind: 'uniform' | 'range' | 'bernoulli' | 'pick';
  args: number[];
  value: number;
  justification: string;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private counters = new Map<string, number>();
  private recorded: DrawRecord[] | null = null;
  private recordedIdx = 0;
  readonly draws: DrawRecord[] = [];
  onDraw?: (d: DrawRecord) => void;

  constructor(private runSeed: string) {}

  /** Replay mode: feed previously recorded draws; values are reused verbatim. */
  useRecorded(draws: DrawRecord[]): void {
    this.recorded = draws;
    this.recordedIdx = 0;
  }

  private next(name: string): { u: number; lineage: string } {
    const c = (this.counters.get(name) ?? 0) + 1;
    this.counters.set(name, c);
    const lineage = `${this.runSeed}:${name}:${c}`;
    const u = mulberry32(fnv1a(lineage))();
    return { u, lineage };
  }

  private emit(rec: DrawRecord): number {
    if (this.recorded) {
      const r = this.recorded[this.recordedIdx++];
      if (!r || r.name !== rec.name) {
        throw new Error(`replay draw mismatch: expected ${rec.name}, log has ${r?.name ?? 'nothing'}`);
      }
      this.draws.push(r);
      this.onDraw?.(r);
      return r.value;
    }
    this.draws.push(rec);
    this.onDraw?.(rec);
    return rec.value;
  }

  uniform(name: string, justification: string): number {
    const { u, lineage } = this.next(name);
    return this.emit({ name, lineage, kind: 'uniform', args: [], value: u, justification });
  }

  range(name: string, lo: number, hi: number, justification: string): number {
    const { u, lineage } = this.next(name);
    return this.emit({ name, lineage, kind: 'range', args: [lo, hi], value: lo + u * (hi - lo), justification });
  }

  bernoulli(name: string, p: number, justification: string): boolean {
    const { u, lineage } = this.next(name);
    return this.emit({ name, lineage, kind: 'bernoulli', args: [p], value: u < p ? 1 : 0, justification }) === 1;
  }

  pick(name: string, n: number, justification: string): number {
    const { u, lineage } = this.next(name);
    return this.emit({ name, lineage, kind: 'pick', args: [n], value: Math.min(n - 1, Math.floor(u * n)), justification });
  }
}
