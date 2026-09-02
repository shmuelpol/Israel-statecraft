// Shared structured contracts for engine, AI layer, Atlas, server and client.
// Player-facing strings are Hebrew (suffix `He`). Internal ids are English slugs.

import type { DrawRecord } from './rng.js';

// ---------------------------------------------------------------- time & meta

export type IsoDate = string; // YYYY-MM-DD

export interface ClockConfig {
  startDate: IsoDate;
  endDate: IsoDate;
  tickMs: number;         // real ms per engine tick
  daysPerSecond: number;  // sim days advanced per real second
}

export interface Versions {
  scenario: string;
  atlas: string;
  prompts: string;
  engine: string;
  models: Record<string, string>;
  provider: string;
}

// ---------------------------------------------------------------- metrics

export interface MetricDef {
  id: string;
  nameHe: string;
  descHe: string;      // compact explanation shown on expand
  icon: string;        // icon key
  defaultVisible: boolean;
  higherIsBetter: boolean;
}

export interface MetricState {
  id: string;
  value: number;   // 0..100 internal float; UI renders qualitative bar
  trend: number;   // recent delta/day, for arrow rendering
  visible: boolean;
  dynamic?: boolean; // added at runtime via Director persuasion
}

// ---------------------------------------------------------------- map

export type RegionStatus =
  | 'normal' | 'controlled' | 'contested' | 'buffer' | 'demilitarized'
  | 'evacuated' | 'occupied' | 'international' | 'fragmented' | 'collapsed';

export interface RegionDef {
  id: string;
  nameHe: string;
  kind: 'country' | 'territory' | 'sea' | 'zone';
  polygon: [number, number][];  // lon/lat, stylized original geometry
  labelAt?: [number, number];
  initialController: string;    // actor id
  selectable: boolean;
}

export interface RegionState {
  id: string;
  controller: string;
  status: RegionStatus;
  intensity: number;      // 0..1 conflict intensity for rendering
  overlays: string[];     // overlay primitive ids (front, corridor, airdefense...)
}

// ---------------------------------------------------------------- actors

export type ActorLanguage = 'he' | 'ar' | 'fa' | 'en' | 'tr' | 'ru' | 'zh';

export interface ActorMemoryItem {
  day: number;
  kind: 'promise' | 'threat' | 'betrayal' | 'concession' | 'attack' | 'aid' | 'statement' | 'loss' | 'victory';
  aboutActor: string;
  salience: number; // 0..1, decays
  noteHe: string;
}

export interface LeadershipState {
  leaderName: string;    // native or transliterated; display only
  alive: boolean;
  sinceDay: number;
  cohesion: number;      // 0..1 internal cohesion
}

export interface ActorState {
  id: string;
  nameHe: string;
  language: ActorLanguage;
  leadership: LeadershipState;
  priorityOrder: string[];          // objective ids, authored core order (time-varying)
  timeHorizonYears: number;
  willingnessToPay: number;         // 0..1
  capabilities: Record<string, number>;          // 0..100 actual
  perceived: Record<string, Record<string, number>>; // perceived[otherActor][capability]
  beliefs: Record<string, number | string | boolean>;
  knownFacts: string[];             // claim/anchor ids the actor knows
  memory: ActorMemoryItem[];
  relationships: Record<string, number>; // -100..100 toward other actors
  externalControl: Record<string, number>; // controller actor -> 0..1
  adaptation: Record<string, number>;      // method id -> exposure count
  intelPenetrationByIsrael: number;        // 0..1
  alive: boolean;                          // organization/state functioning
}

// ---------------------------------------------------------------- events

export type Urgency = 'immediate' | 'urgent' | 'window';

export interface EventOption {
  id: string;
  labelHe: string;
  intent: string;   // routed intent id understood by the orchestrator
  tradeoffHe?: string; // professional-echelon note on this path's cost (annotated at view time)
}

export interface ActionableEvent {
  id: string;
  templateId?: string;
  type: string;
  titleHe: string;
  descHe: string;
  detailHe?: string;
  sourceHe: string;          // who reports this (fog of war provenance)
  regionId?: string;
  anchor?: [number, number]; // lon/lat map anchor
  urgency: Urgency;
  createdDay: number;
  expiresDay: number;
  graceUsed: boolean;
  options: EventOption[];
  allowFreeText: boolean;
  defaultResolver: string;   // institution/actor id acting on silence
  defaultIntent: string;
  status: 'active' | 'answered' | 'expired' | 'resolved';
  chainId?: string;
  hiddenNote?: string;       // internal causal note, never rendered
  defaultResolutionHe?: string; // feed text when the default institution acts on silence
}

// ---------------------------------------------------------------- player IO

export type MessageIntent =
  | 'question' | 'assessment' | 'options' | 'order' | 'standing_policy'
  | 'cancel_policy' | 'public_statement' | 'intl_statement' | 'diplomacy'
  | 'coalition' | 'preparation' | 'intel_request' | 'wait' | 'event_response';

export interface PlayerMessage {
  id: string;
  text: string;
  simDay: number;
  realTs: number;
  contextIds: string[];
  eventId?: string;
  optionId?: string;
  intent?: MessageIntent;
  targetId?: string;         // actor/institution the message routes to
  status: 'queued' | 'processing' | 'answered' | 'stale' | 'blocked';
  late: boolean;
  blockedReasonHe?: string;
}

export type CommKind = 'internal' | 'public' | 'diplomatic' | 'intel' | 'hostile' | 'media' | 'outcome';

export interface CommMessage {
  id: string;
  simDay: number;
  senderId: string;
  senderHe: string;
  kind: CommKind;
  textHe: string;
  confidence?: 'high' | 'medium' | 'low';
  regionId?: string;
  eventId?: string;
  inReplyTo?: string;  // player message id — renders as a visible consequence of that decision
  /**
   * Feed curation: 'high' = belongs in the PM's strategic stream (major
   * developments, consequences of player decisions, decision-relevant intel);
   * 'low' = ambient detail, visible only in the detailed resolution and in
   * the updates center. Default when omitted: low.
   */
  significance?: 'high' | 'low';
}

export interface DirectorMessage {
  id: string;
  simDay: number;
  from: 'player' | 'director';
  textHe: string;
  kind?: 'answer' | 'refusal' | 'ruling' | 'concession' | 'blocked';
}

// ---------------------------------------------------------------- plans

export interface TrendEffect {
  metricId?: string;
  hiddenVar?: string;
  deltaPerDay: number;
  days: number;
  reason: string;       // internal causal note (audit), not player-facing
}

export interface ScheduledEventSpec {
  afterDays: number;
  durationDays?: number;          // overrides urgency default window
  probability?: number;           // if <1, requires named draw
  drawName?: string;
  event: Omit<ActionableEvent, 'id' | 'status' | 'createdDay' | 'expiresDay' | 'graceUsed'>;
}

export interface MapChange {
  afterDays: number;
  regionId: string;
  controller?: string;
  status?: RegionStatus;
  intensity?: number;
  addOverlays?: string[];
  removeOverlays?: string[];
}

export interface ActorDecisionRecord {
  actorId: string;
  language: ActorLanguage;
  promptRef: string;           // prompt template id + version (audit)
  intent: string;              // structured chosen action id
  argumentsJson?: string;
  rationaleShort: string;      // concise rationale summary (NOT chain-of-thought)
  usedBeliefKeys: string[];    // audit: what the actor knew
  adjudication?: {
    effectsSummary: string;
    draws: string[];           // draw names consumed
  };
}

export interface DynamicMechanic {
  id: string;
  labelHe: string;
  type: 'metric' | 'overlay' | 'rule';
  causalMeaning: string;
  inputs: string[];            // hidden vars / metrics it reads
  outputs: TrendEffect[];
  visible: boolean;
  mapRepr?: string;
  scoringRelevance?: string;
}

export interface AtlasProvenance {
  nodeIds: string[];
  mode: 'follow' | 'blend' | 'escape' | 'none';
  compatibility: number; // 0..1 assessed fit
  reason?: string;       // escape reason
}

export interface WorldPlan {
  id: string;
  createdDay: number;
  horizonDays: number;
  trends: TrendEffect[];
  events: ScheduledEventSpec[];
  comms: { afterDays: number; msg: Omit<CommMessage, 'id' | 'simDay'> }[];
  mapChanges: MapChange[];
  optionUnlocks: string[];
  optionClosures: string[];
  actorDecisions: ActorDecisionRecord[];
  dynamicMechanics?: DynamicMechanic[];
  commitments?: Omit<Commitment, 'id'>[];
  attentionHints?: Record<string, number>;
  provenance: AtlasProvenance;
}

// ---------------------------------------------------------------- state

export interface StandingPolicy {
  id: string;
  textHe: string;
  topic: string;
  createdDay: number;
  active: boolean;
}

export interface Commitment {
  id: string;
  day: number;
  byActor: string;
  toward: string;
  kind: 'promise' | 'threat' | 'ceasefire' | 'concession' | 'statement' | 'betrayal';
  textHe: string;
  weight: number; // 0..1 credibility relevance
}

export interface IrreversibleLoss {
  day: number;
  kind: string;        // casualties | hostage_deaths | territory_lost | economy | cohesion | capability...
  magnitude: number;   // 0..1
  noteHe: string;
}

export interface OfficeState {
  inOffice: boolean;
  observer: boolean;
  sinceDay: number;
  lostDay?: number;
  returnMomentum: number; // hidden 0..1
}

export interface HostageState {
  totalTaken: number;
  living: number;    // currently held alive
  deceasedHeld: number;
  returnedAlive: number;
  returnedBodies: number;
  leverage: number;  // 0..1 hidden
}

export interface DivergenceState {
  dims: Record<string, number>;  // 0 identical .. 1 fully divergent per dimension
  aggregate: number;
  level: 'low' | 'moderate' | 'high';
}

export interface GameState {
  runId: string;
  seed: string;
  versions: Versions;
  clock: ClockConfig;
  simDay: number;          // fractional
  ended: boolean;
  office: OfficeState;
  metrics: Record<string, MetricState>;
  hidden: Record<string, number>;
  regions: Record<string, RegionState>;
  actors: Record<string, ActorState>;
  events: Record<string, ActionableEvent>;
  comms: CommMessage[];
  playerMessages: PlayerMessage[];
  directorChat: DirectorMessage[];
  standingPolicies: StandingPolicy[];
  commitments: Commitment[];
  attention: Record<string, number>;   // hidden topic -> 0..1
  optionStates: Record<string, 'latent' | 'open' | 'closed'>;
  divergence: DivergenceState;
  hostages: HostageState;
  losses: IrreversibleLoss[];
  activePlanId?: string;
  dynamicMechanics: DynamicMechanic[];
  anchorsFired: string[];       // canonical anchors that occurred in this run
  anchorsSuppressed: string[];  // anchors whose prerequisites died
  counters: Record<string, number>;
}

// ---------------------------------------------------------------- atlas

export interface AtlasTrajectory {
  id: string;
  labelHe?: string;
  description: string;
  steps: { afterDays: number; development: string; mapHints?: string[] }[];
  longHorizon: string;   // where this goes by end of scenario if it continues
}

export interface AtlasNode {
  id: string;
  date: IsoDate;
  era: string;                       // H0..H13 or branch family id
  branchFamily?: string;             // A..L for counterfactual basins
  signature: Record<string, number>; // state feature vector for retrieval
  groundTruth: string[];
  actorBeliefs: Record<string, string[]>;
  knownUnknowns: Record<string, string[]>;
  unknownUnknowns?: Record<string, string[]>;
  capabilities: Record<string, Record<string, number>>;
  perceivedCapabilities?: Record<string, Record<string, number>>;
  goals: Record<string, string[]>;            // actor -> priority-ordered objective ids
  fears: Record<string, string[]>;
  timeHorizons: Record<string, number>;
  willingnessToPay: Record<string, number>;
  commitments: string[];
  domesticConstraints: Record<string, string[]>;
  internationalAttitudes: Record<string, number>; // actor -> -100..100 toward Israel
  whoBenefitsFromTime: string[];
  openOptions: string[];
  latentOptions: string[];
  closedOptions: string[];
  expectedDevelopments: string[];
  trajectories: AtlasTrajectory[];
  exogenous: string[];   // developments independent of Israeli policy
  endogenous: string[];  // developments Israel influences
  mapState: Record<string, { controller: string; status: RegionStatus }>;
  prerequisites: Prerequisite[];   // conditions for this node to be applicable
  sources: { id: string; confidence: number }[];
  confidence: number;
}

export type Prerequisite =
  | { kind: 'actorAlive'; actorId: string; leader?: boolean }
  | { kind: 'regionController'; regionId: string; controller: string }
  | { kind: 'hiddenVarMin'; varId: string; min: number }
  | { kind: 'hiddenVarMax'; varId: string; max: number }
  | { kind: 'anchorFired'; anchorId: string }
  | { kind: 'anchorNotSuppressed'; anchorId: string }
  | { kind: 'hostagesHeldMin'; min: number }
  | { kind: 'divergenceMax'; max: number };

// ---------------------------------------------------------------- canonical timeline

export interface CanonicalAnchor {
  id: string;
  date: IsoDate;
  titleHe: string;
  title: string;
  /**
   * exogenous — fires on schedule while prerequisites hold (world doesn't wait for Israel);
   * israeli_decision — spawns a decision card; fires only if the player takes the historical path;
   * enemy_action — an adversary/institution decision applied via the actor pipeline.
   */
  kind: 'exogenous' | 'israeli_decision' | 'enemy_action';
  decisionIntent?: string;        // intent that counts as following history (israeli_decision)
  prerequisites: Prerequisite[];
  divergenceDims: string[];       // dims this anchor's occurrence/absence moves
  plan: Partial<Pick<WorldPlan, 'trends' | 'events' | 'comms' | 'mapChanges' | 'optionUnlocks' | 'optionClosures' | 'commitments'>>;
  windowDays: number;             // scheduling tolerance around date
  weight: number;                 // importance for historical-reproduction scoring
  sources: string[];
}

// ---------------------------------------------------------------- replay

export type ReplayEntryType =
  | 'run_start' | 'plan_applied' | 'plan_rejected' | 'event_spawned' | 'event_answered'
  | 'event_expired' | 'event_resolved' | 'player_msg' | 'msg_routed' | 'comm' | 'director_msg'
  | 'map_change' | 'metrics_snapshot' | 'draw' | 'office_change' | 'policy_change'
  | 'context_select' | 'mechanic_added' | 'metric_visibility' | 'injection_blocked'
  | 'atlas_escape' | 'latency' | 'anchor_fired' | 'anchor_suppressed' | 'commitment'
  | 'loss_recorded' | 'run_end' | 'score';

export interface ReplayEntry {
  seq: number;
  simDay: number;
  realTs: number;
  type: ReplayEntryType;
  payload: unknown;
  stateHash?: number;
}

// ---------------------------------------------------------------- scoring

export interface ScoreDimension {
  id: string;
  nameHe: string;
  score: number;    // 0..100
  weight: number;
  notesHe: string;
}

export interface FinalScoreReport {
  composite: number;
  dimensions: ScoreDimension[];
  positivesHe: string[];
  negativesHe: string[];
  unresolvedHe: string[];
  longTermWarningsHe: string[];
  baselineComparisonHe: string;
  explanationHe: string;
}

// ---------------------------------------------------------------- scenario package

export interface EventTemplate {
  id: string;
  type: string;
  titleHe: string;
  descHe: string;
  sourceHe: string;
  regionId?: string;
  urgency: Urgency;
  options: EventOption[];
  allowFreeText: boolean;
  defaultResolver: string;
  defaultIntent: string;
}

export interface ActorDef {
  id: string;
  nameHe: string;
  language: ActorLanguage;
  leaderName: string;
  priorityOrder: string[];
  timeHorizonYears: number;
  willingnessToPay: number;
  capabilities: Record<string, number>;
  relationships: Record<string, number>;
  externalControl?: Record<string, number>;
  intelPenetrationByIsrael: number;
  promptCore: string;          // authored core, in the actor's own language
  decisionGuidance: string;    // native-language decision instructions
}

export interface ScoringGuidelines {
  dimensions: { id: string; nameHe: string; weight: number; hint: string }[];
  catastropheCaps: { condition: string; cap: number }[];
  longTermWarnings: string[];
  baselineNoteHe: string;
}

export interface OpeningRules {
  attackAnchorId: string;
  minDelayDays: number;
  maxDelayDays: number;
  readinessCostPerDay: { metricId: string; delta: number }[];
  multiFrontThreshold: number; // hidden enemy readiness that enables coordinated attack
}

export interface ScenarioPackage {
  meta: { id: string; version: string; titleHe: string; descriptionHe: string };
  clock: ClockConfig;
  metrics: MetricDef[];
  defaultVisibleMetrics: string[];
  hiddenVars: Record<string, number>; // id -> initial value
  regions: RegionDef[];
  actors: ActorDef[];
  eventTemplates: EventTemplate[];
  canonicalTimeline: CanonicalAnchor[];
  openingRules: OpeningRules;
  scoring: ScoringGuidelines;
  initialHostages: HostageState;
  atlasPath: string;
  promptsVersion: string;
}

// re-export for convenience
export type { DrawRecord };
