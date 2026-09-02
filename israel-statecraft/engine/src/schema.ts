// Strict validators for AI-produced structures. Malformed output is rejected
// (never applied) — the engine keeps running on the previous plan.

import type { WorldPlan, FinalScoreReport, DynamicMechanic, ScheduledEventSpec } from './types.js';

export interface ValidationResult { ok: boolean; errors: string[] }

const URGENCIES = new Set(['immediate', 'urgent', 'window']);
const STATUSES = new Set(['normal', 'controlled', 'contested', 'buffer', 'demilitarized', 'evacuated', 'occupied', 'international', 'fragmented', 'collapsed']);
const COMM_KINDS = new Set(['internal', 'public', 'diplomatic', 'intel', 'hostile', 'media', 'outcome']);
const PROV_MODES = new Set(['follow', 'blend', 'escape', 'none']);

function err(errors: string[], cond: boolean, msg: string): void {
  if (!cond) errors.push(msg);
}

function isNum(v: unknown): v is number { return typeof v === 'number' && Number.isFinite(v); }
function isStr(v: unknown): v is string { return typeof v === 'string'; }
function isArr(v: unknown): v is unknown[] { return Array.isArray(v); }

export interface WorldContext {
  metricIds: Set<string>;
  hiddenVarIds: Set<string>;
  regionIds: Set<string>;
  actorIds: Set<string>;
}

function validateEventSpec(e: ScheduledEventSpec, ctx: WorldContext, errors: string[], i: number): void {
  const p = `events[${i}]`;
  err(errors, isNum(e.afterDays) && e.afterDays >= 0, `${p}.afterDays must be >= 0`);
  const ev = e.event as Record<string, unknown> | undefined;
  err(errors, !!ev, `${p}.event missing`);
  if (!ev) return;
  err(errors, isStr(ev.titleHe) && (ev.titleHe as string).length > 0, `${p}.event.titleHe required`);
  err(errors, isStr(ev.descHe), `${p}.event.descHe required`);
  err(errors, isStr(ev.sourceHe), `${p}.event.sourceHe required`);
  err(errors, URGENCIES.has(ev.urgency as string), `${p}.event.urgency invalid`);
  err(errors, ev.regionId === undefined || ctx.regionIds.has(ev.regionId as string), `${p}.event.regionId unknown: ${ev.regionId}`);
  const opts = ev.options;
  err(errors, isArr(opts) && (opts as unknown[]).length <= 4, `${p}.event.options must be array of <=4`);
  if (isArr(opts)) {
    for (const o of opts as Record<string, unknown>[]) {
      err(errors, isStr(o.id) && isStr(o.labelHe) && isStr(o.intent), `${p}.event.options entries need id/labelHe/intent`);
    }
  }
  err(errors, isStr(ev.defaultResolver), `${p}.event.defaultResolver required`);
  err(errors, isStr(ev.defaultIntent), `${p}.event.defaultIntent required`);
  // Cards must not carry predicted metric deltas.
  const text = `${ev.titleHe} ${ev.descHe} ${ev.detailHe ?? ''}`;
  err(errors, !/[+-]\d+\s*%|[+-]\d+\s*נק/.test(text), `${p} event text appears to expose predicted metric deltas`);
  if (e.probability !== undefined) {
    err(errors, isNum(e.probability) && e.probability > 0 && e.probability <= 1, `${p}.probability out of (0,1]`);
    err(errors, isStr(e.drawName), `${p}.drawName required when probability < 1`);
  }
}

export function validateWorldPlan(plan: unknown, ctx: WorldContext): ValidationResult {
  const errors: string[] = [];
  const p = plan as Partial<WorldPlan> | null;
  if (!p || typeof p !== 'object') return { ok: false, errors: ['plan is not an object'] };
  err(errors, isStr(p.id), 'id required');
  err(errors, isNum(p.createdDay), 'createdDay required');
  err(errors, isNum(p.horizonDays) && p.horizonDays! > 0 && p.horizonDays! <= 120, 'horizonDays must be in (0,120]');
  err(errors, isArr(p.trends), 'trends must be array');
  if (isArr(p.trends)) {
    p.trends!.forEach((t, i) => {
      err(errors, (t.metricId === undefined) !== (t.hiddenVar === undefined), `trends[${i}] must target exactly one of metricId/hiddenVar`);
      if (t.metricId !== undefined) err(errors, ctx.metricIds.has(t.metricId), `trends[${i}].metricId unknown: ${t.metricId}`);
      if (t.hiddenVar !== undefined) err(errors, ctx.hiddenVarIds.has(t.hiddenVar), `trends[${i}].hiddenVar unknown: ${t.hiddenVar}`);
      // metrics move gradually (player-visible bars); hidden escalation levels may jump on phase changes
      const cap = t.metricId !== undefined ? 15 : 40;
      err(errors, isNum(t.deltaPerDay) && Math.abs(t.deltaPerDay) <= cap, `trends[${i}].deltaPerDay must be |x|<=${cap}`);
      err(errors, isNum(t.days) && t.days > 0 && t.days <= 400, `trends[${i}].days out of range`);
    });
  }
  err(errors, isArr(p.events), 'events must be array');
  if (isArr(p.events)) p.events!.forEach((e, i) => validateEventSpec(e, ctx, errors, i));
  err(errors, isArr(p.comms), 'comms must be array');
  if (isArr(p.comms)) {
    p.comms!.forEach((c, i) => {
      err(errors, isNum(c.afterDays) && c.afterDays >= 0, `comms[${i}].afterDays invalid`);
      err(errors, !!c.msg && isStr(c.msg.textHe) && c.msg.textHe.length > 0, `comms[${i}].msg.textHe required`);
      err(errors, !!c.msg && COMM_KINDS.has(c.msg.kind), `comms[${i}].msg.kind invalid`);
      err(errors, !!c.msg && isStr(c.msg.senderHe), `comms[${i}].msg.senderHe required`);
    });
  }
  err(errors, isArr(p.mapChanges), 'mapChanges must be array');
  if (isArr(p.mapChanges)) {
    p.mapChanges!.forEach((m, i) => {
      err(errors, ctx.regionIds.has(m.regionId), `mapChanges[${i}].regionId unknown: ${m.regionId}`);
      if (m.controller !== undefined) err(errors, ctx.actorIds.has(m.controller), `mapChanges[${i}].controller unknown: ${m.controller}`);
      if (m.status !== undefined) err(errors, STATUSES.has(m.status), `mapChanges[${i}].status invalid`);
      err(errors, isNum(m.afterDays) && m.afterDays >= 0, `mapChanges[${i}].afterDays invalid`);
    });
  }
  err(errors, isArr(p.optionUnlocks) && isArr(p.optionClosures), 'optionUnlocks/optionClosures must be arrays');
  err(errors, isArr(p.actorDecisions), 'actorDecisions must be array');
  if (isArr(p.actorDecisions)) {
    p.actorDecisions!.forEach((d, i) => {
      err(errors, ctx.actorIds.has(d.actorId), `actorDecisions[${i}].actorId unknown: ${d.actorId}`);
      err(errors, isStr(d.intent), `actorDecisions[${i}].intent required`);
      err(errors, isStr(d.rationaleShort) && d.rationaleShort.length <= 600, `actorDecisions[${i}].rationaleShort required, <=600 chars`);
      err(errors, isStr(d.promptRef), `actorDecisions[${i}].promptRef required`);
    });
  }
  const prov = p.provenance as WorldPlan['provenance'] | undefined;
  err(errors, !!prov && PROV_MODES.has(prov.mode) && isArr(prov.nodeIds), 'provenance required with mode + nodeIds');
  if (prov?.mode === 'escape') err(errors, isStr(prov.reason) && prov.reason.length > 0, 'escape requires a reason');
  if (p.dynamicMechanics) p.dynamicMechanics.forEach((m, i) => {
    const r = validateDynamicMechanic(m, ctx);
    if (!r.ok) errors.push(...r.errors.map((e) => `dynamicMechanics[${i}]: ${e}`));
  });
  return { ok: errors.length === 0, errors };
}

export function validateDynamicMechanic(m: unknown, ctx: WorldContext): ValidationResult {
  const errors: string[] = [];
  const d = m as Partial<DynamicMechanic> | null;
  if (!d || typeof d !== 'object') return { ok: false, errors: ['mechanic is not an object'] };
  err(errors, isStr(d.id) && /^[a-z0-9_]+$/.test(d.id!), 'id must be a slug');
  err(errors, isStr(d.labelHe) && d.labelHe!.length > 0, 'labelHe required');
  err(errors, d.type === 'metric' || d.type === 'overlay' || d.type === 'rule', 'type invalid');
  err(errors, isStr(d.causalMeaning) && d.causalMeaning!.length >= 10, 'causalMeaning required (real modeled relationship)');
  err(errors, isArr(d.inputs) && d.inputs!.length > 0, 'inputs required — mechanic must depend on modeled state');
  if (isArr(d.inputs)) {
    for (const i of d.inputs!) err(errors, ctx.hiddenVarIds.has(i) || ctx.metricIds.has(i), `input unknown: ${i}`);
  }
  err(errors, isArr(d.outputs), 'outputs must be array');
  err(errors, typeof d.visible === 'boolean', 'visible required');
  return { ok: errors.length === 0, errors };
}

export function validateScoreReport(r: unknown): ValidationResult {
  const errors: string[] = [];
  const s = r as Partial<FinalScoreReport> | null;
  if (!s || typeof s !== 'object') return { ok: false, errors: ['report is not an object'] };
  err(errors, isNum(s.composite) && s.composite! >= 0 && s.composite! <= 100, 'composite must be 0..100');
  err(errors, isArr(s.dimensions) && s.dimensions!.length >= 5, 'at least 5 dimensions');
  if (isArr(s.dimensions)) {
    s.dimensions!.forEach((d, i) => {
      err(errors, isStr(d.id) && isStr(d.nameHe) && isNum(d.score) && isNum(d.weight) && isStr(d.notesHe), `dimensions[${i}] incomplete`);
    });
  }
  for (const k of ['positivesHe', 'negativesHe', 'unresolvedHe', 'longTermWarningsHe'] as const) {
    err(errors, isArr(s[k]), `${k} must be array`);
  }
  err(errors, isStr(s.baselineComparisonHe), 'baselineComparisonHe required');
  err(errors, isStr(s.explanationHe) && s.explanationHe!.length >= 40, 'explanationHe required');
  return { ok: errors.length === 0, errors };
}
