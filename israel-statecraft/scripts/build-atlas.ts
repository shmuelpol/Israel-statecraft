// Offline Atlas build: generate → critic passes → write artifacts + coverage report.
// Usage: npm run atlas

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateAtlas, ATLAS_VERSION } from '../atlas/src/generate.js';
import { runAllCritics } from '../atlas/src/critics.js';
import { ACTORS } from '../scenarios/swords-of-iron/actors.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'atlas', 'out');
mkdirSync(outDir, { recursive: true });

const nodes = generateAtlas();
const actorIds = new Set(ACTORS.map((a) => a.id));
const reports = runAllCritics(nodes, actorIds);

const totalViolations = reports.reduce((s, r) => s + r.violations.length, 0);
const branchNodes = nodes.filter((n) => n.branchFamily).length;
const snapback = reports.find((r) => r.critic === 'historical-snapback')!;
const snapbackRate = branchNodes ? snapback.violations.length / branchNodes : 0;

// strip generator-internal fields before shipping
const shipped = nodes.map(({ removedAnchors: _r, ...n }) => n);

writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify({ version: ATLAS_VERSION, generated: 'offline', nodes: shipped }, null, 1), 'utf-8');

const byEra = new Map<string, number>();
for (const n of nodes) byEra.set(n.era, (byEra.get(n.era) ?? 0) + 1);

const report = `# Atlas Coverage & Quality Report

Version: ${ATLAS_VERSION}
Nodes: ${nodes.length} (canonical spine: ${byEra.get('canonical') ?? 0}, branch nodes: ${branchNodes}, extreme states: ${byEra.get('extreme') ?? 0})

## Era / family distribution
${[...byEra.entries()].map(([e, c]) => `- ${e}: ${c}`).join('\n')}

## Counterfactual families (A–L)
${['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((f) => `- family ${f}: ${nodes.filter((n) => n.branchFamily === f).length} nodes, long-horizon: ${nodes.some((n) => n.branchFamily === f && n.trajectories.some((t) => t.longHorizon.length > 20)) ? 'yes' : 'NO'}`).join('\n')}

## Extreme-state coverage (seed §7)
${nodes.filter((n) => n.era === 'extreme').map((n) => `- ${n.id}: ${n.groundTruth[n.groundTruth.length - 1]}`).join('\n')}

## Critic results
${reports.map((r) => `- ${r.critic}: ${r.violations.length === 0 ? 'PASS' : `FAIL (${r.violations.length})`}${r.violations.slice(0, 5).map((v) => `\n    - ${v.nodeId}: ${v.detail}`).join('')}`).join('\n')}

## Measured historical snapback rate
${(snapbackRate * 100).toFixed(2)}% of branch nodes (target: 0%)

Overall: ${totalViolations === 0 ? 'ALL CRITICS PASS' : `${totalViolations} violations — DO NOT SHIP`}
`;
writeFileSync(path.join(outDir, 'coverage_report.md'), report, 'utf-8');

console.log(`atlas: ${nodes.length} nodes → atlas/out/atlas.json`);
console.log(`critics: ${totalViolations === 0 ? 'all pass' : totalViolations + ' violations'}`);
for (const r of reports) {
  if (r.violations.length) {
    console.log(`  ${r.critic}:`);
    for (const v of r.violations.slice(0, 10)) console.log(`    - ${v.nodeId}: ${v.detail}`);
  }
}
if (totalViolations > 0) process.exit(1);
