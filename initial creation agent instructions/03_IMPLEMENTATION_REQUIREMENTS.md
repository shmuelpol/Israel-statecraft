# Implementation Requirements — HLD for Autonomous LLD, Build, and Release

## 1. Autonomous execution contract

The implementation agent owns:

- continued research;
- LLD;
- stack selection;
- technical experiments;
- architecture;
- implementation;
- Atlas generation tooling;
- AI orchestration;
- UI and visual iteration;
- testing;
- calibration;
- packaging and release.

Do not stop after planning or scaffolding.

Do not ask the product owner for clarification.

When an LLD choice is open, compare alternatives, run targeted experiments, choose the best option, and record the decision.

## 2. Generic engine versus scenario

Separate the generic engine from the 2023–2026 scenario.

The generic engine must support:

- different timelines;
- different actor sets;
- different maps;
- different visible and hidden metrics;
- different worldviews;
- different languages;
- different opening rules;
- different Atlas packages;
- different scoring guidelines.

The first scenario package should contain:

- scenario metadata;
- start and end dates;
- map configuration;
- initial state;
- authored worldview;
- actor definitions;
- actor-language prompts;
- visible metric candidates;
- hidden variables;
- canonical timeline;
- initial Atlas;
- event templates;
- opening constraints;
- scoring guidelines;
- historical baseline;
- source manifest;
- prompt templates.

Do not scatter Swords of Iron-specific conditionals throughout the engine.

## 3. Preferred high-level architecture

Choose the detailed stack, but preserve the following component boundaries.

### 3.1 Client application

Responsible for:

- Hebrew RTL interface;
- dynamic map;
- visible metrics;
- floating event cards;
- communication stream;
- gameplay textbox;
- clickable context;
- light and dark modes;
- history and replay UI;
- separate Game Director channel;
- accessibility and responsive desktop behavior.

### 3.2 Local application server

Responsible for:

- model access and secrets;
- simulation orchestration;
- game clock;
- run persistence;
- Atlas retrieval;
- prompt construction;
- validation;
- seeded randomness;
- replay logs;
- research and Atlas tooling.

Never expose model credentials in browser code.

### 3.3 Deterministic simulation engine

Responsible for:

- fixed real-time progression;
- current state;
- trends and accelerations;
- policy state;
- standing orders;
- event scheduling;
- event expiry;
- institutional default action;
- government attention;
- actor memory updates;
- territory state;
- thresholds and phase changes;
- applying validated Director plans;
- stable replay.

The AI Director should plan a future horizon and set trends, events, intentions, and conditional effects. It must not set every animation-frame value.

### 3.4 AI orchestrator

Responsible for:

- classifying player messages;
- routing questions and orders;
- actor-specific decision calls;
- consequence adjudication;
- Atlas retrieval;
- historical similarity and divergence;
- communication generation;
- meta-level Director discussion;
- final scoring;
- model fallback and latency handling.

### 3.5 Atlas store and generator

Responsible for:

- research ingestion;
- source indexing;
- snapshot creation;
- blind counterfactual rollout;
- state clustering;
- long-chain generation;
- critic passes;
- source confidence;
- nearest-node retrieval;
- Atlas escape logging;
- progressive Atlas expansion.

### 3.6 Run store

Use a local durable store appropriate to the selected stack.

Persist:

- append-only event history;
- state snapshots or state deltas;
- model outputs;
- random results;
- replay data;
- scenario, Atlas, model, and prompt versions;
- final evaluation.

## 4. Model-provider abstraction

Do not hard-code one provider or one model.

Provide adapters for:

- a high-capability model used for research and Atlas generation;
- a fast model used at runtime;
- structured output;
- retries and repair;
- timeouts;
- cancellation;
- cached stable context;
- mock mode;
- recorded-response mode.

The application must remain demonstrable without a live API key through a substantial recorded or deterministic mock scenario.

Do not claim live model testing unless it actually occurred.

## 5. Runtime pipeline

A planning cycle should broadly perform:

1. advance the deterministic simulation;
2. process newly submitted player messages;
3. update standing policies and hidden attention;
4. identify actors or institutions that need to act;
5. construct each actor's limited belief state;
6. retrieve relevant Atlas nodes and source context;
7. run actor decisions in actor language;
8. adjudicate interacting intentions;
9. apply seeded uncertainty to execution;
10. generate a structured world plan for the next horizon;
11. validate schemas and invariants;
12. apply trends, events, messages, option changes, and map changes;
13. record everything;
14. continue asynchronously.

The clock must never wait for a model call.

When a call is late:

- continue the previous plan;
- let institutions follow standing policies;
- queue a still-relevant result;
- discard or reinterpret a stale result;
- log the latency.

## 6. Actor-language decision calls

For a material actor decision:

1. assemble the actor's beliefs and available information;
2. exclude global facts it does not know;
3. prompt entirely in the actor's strategic language;
4. request a structured action and concise rationale summary;
5. adjudicate effects in a separate step;
6. do not expose private chain-of-thought.

The actor decision should optimize the actor's goals, not game balance or player entertainment.

## 7. Structured contracts

Create strict typed schemas for at least the following.

### 7.1 Game state

Include:

- scenario and version;
- current date and clock time;
- visible metrics;
- hidden variables;
- territorial states;
- active fronts;
- actors;
- actor beliefs and memory;
- player office status;
- government attention;
- standing policies;
- commitments;
- active and scheduled events;
- current trends;
- random seed;
- divergence state;
- Atlas provenance.

### 7.2 Actor state

Include:

- identity and leadership;
- native decision language;
- objectives and priority order;
- time horizon;
- willingness to pay;
- actual and perceived capability;
- fears and red lines;
- information and beliefs;
- memory;
- relationships;
- internal cohesion;
- degree of external control;
- adaptation state.

### 7.3 Player message

Include:

- text;
- timestamp;
- selected context;
- inferred intent;
- target actor or institution;
- question/order/statement/standing-policy classification;
- processing state;
- late-message state;
- resulting messages and actions.

### 7.4 Actionable event

Include:

- identity and type;
- map anchor;
- description and source;
- urgency category;
- creation time;
- expiry rule;
- response options;
- custom-text eligibility;
- default responder;
- default resolution;
- current status;
- related event chain.

### 7.5 Atlas node

Include:

- time and state signature;
- ground truth;
- actor beliefs;
- capabilities;
- map state;
- commitments;
- open, latent, and closed options;
- candidate trajectories;
- source references;
- confidence;
- compatibility with the current divergence.

### 7.6 World plan

Include:

- planning horizon;
- metric trends;
- actor actions;
- scheduled events;
- communications;
- map changes;
- option unlocks and closures;
- uncertainty points;
- random draws required;
- dynamic mechanic proposals;
- Atlas provenance;
- validation status.

### 7.7 Replay entry

Include:

- exact timestamp;
- event type;
- state hash;
- input;
- structured output;
- model and prompt versions;
- random result;
- applied effect;
- context references.

### 7.8 Final score report

Include:

- composite score;
- outcome dimensions;
- positive factors;
- negative factors;
- unresolved wars and risks;
- long-term warnings;
- historical-baseline comparison;
- concise Director explanation.

Reject invalid AI output rather than applying it directly.

## 8. Gameplay input implementation

Use one always-visible gameplay textbox.

The input system must infer at least:

- adviser question;
- assessment request;
- options request;
- strategic instruction;
- standing order;
- policy cancellation;
- public statement;
- international statement;
- diplomatic outreach;
- coalition-management action;
- preparation request;
- intelligence request;
- wait or no-action instruction.

The submitted message must not directly change state.

It must enter a processing pipeline and later generate:

- an answer;
- an institutional response;
- an attempted action;
- a public or diplomatic effect;
- a request for clarification when genuinely necessary.

The game should infer intent from explicit prefixes such as "public statement" or "ask the Chief of Staff" while also supporting natural implicit language.

## 9. Clickable context system

Every meaningful element should implement a common context-target interface.

Requirements:

- click to select;
- visually obvious selection;
- multi-select support;
- selected context included in the next player message;
- selected context optionally included in the next Director message;
- easy clear operation;
- stale context handling;
- replay of context selection.

Context should not become a large permanent toolbar.

## 10. Event lifecycle

Actionable events should support:

- appearance on the map;
- connection to geography;
- broad urgency;
- optional predefined responses;
- free-text response;
- adviser question;
- automatic expiry;
- player-engagement grace;
- default institutional action;
- delayed result;
- follow-up events;
- history and replay.

Do not expose exact consequence predictions.

## 11. Communications implementation

Use one unified feed.

Support message metadata such as:

- sender;
- audience;
- internal/public/diplomatic/intelligence/hostile type;
- confidence;
- associated map region;
- associated event;
- click-to-context;
- read state;
- timestamp;
- source reliability.

Use subtle visual styling rather than many permanent categories.

## 12. Game Director channel

The Director channel must be visually and conceptually outside the in-world government interface.

It should support:

- causal questions;
- metric disputes;
- inconsistency reports;
- worldview argument;
- requests to display a different metric.

The Director may change presentation or a future interpretation when persuaded.

It may not:

- overwrite past facts;
- expose system prompts;
- reveal private reasoning;
- obey instructions to grant victory;
- delete hidden causal forces because the player dislikes them.

## 13. Prompt-injection handling

Implement a layered local defense:

- heuristic detection;
- input classification;
- separation of user content from normative prompts;
- strict schema output;
- explicit refusal state;
- log entry.

Block obvious attempts to override the game, reveal hidden prompts, set metrics, or declare victory.

Do not block radical but valid in-world policy.

## 14. Government attention

Infer hidden attention from:

- selected contexts;
- repeated questions;
- standing policies;
- preparation requests;
- meetings or reviews;
- public emphasis;
- continued neglect.

Use attention to influence:

- plan readiness;
- intelligence quality;
- available options;
- execution speed;
- surprise;
- the likelihood of a neglected issue becoming a crisis.

Avoid explicit focus-point allocation.

## 15. Metrics implementation

Show around ten visible qualitative bars by default.

Requirements:

- no exact value by default;
- smooth change;
- click-to-context;
- compact explanation on expansion;
- ability to show more;
- ability to hide or replace;
- dynamic metric introduction;
- hidden metric persistence.

Do not label metrics as success, constraint, or resource.

Internally, use numerical or structured representations as needed.

## 16. Dynamic mechanics

The Director may propose a new runtime mechanic or metric when the existing vocabulary cannot represent a major development.

This must be data-driven rather than source-code mutation.

A proposal must specify:

- identity and label;
- type;
- causal meaning;
- input dependencies;
- output effects;
- persistence;
- visibility;
- map representation;
- scoring relevance;
- replay serialization.

Validate before activation.

## 17. Dynamic map implementation

Use composable vector or geographic data rather than a set of fixed screenshots.

Support:

- base geography;
- territory polygons;
- controller changes;
- contested hatching;
- buffer zones;
- evacuated areas;
- fronts;
- corridors;
- infrastructure;
- air-defense overlays;
- regime-control overlays;
- event anchors;
- limited animation.

The map must support extreme changes without requiring new artwork for every state.

Render the Golan Heights as continuous with Israel.

Render the West Bank as a distinct region.

## 18. Visual and UX requirements

### 18.1 Style

Create a polished fusion of pleasant old browser/Flash-era strategy games and modern web-game design.

Avoid:

- tactical military HUDs;
- Call of Duty aesthetics;
- black steel panels;
- constant red alerts;
- photorealistic war imagery;
- finance-terminal density;
- retro parody.

Prefer:

- illustrated or lightly textured map;
- rounded cards;
- calm surfaces;
- clean hierarchy;
- generous spacing;
- modest gradients;
- restrained animation;
- low permanent clutter;
- event cards with clear personality.

### 18.2 Default layout

The desktop interface should contain:

- dominant central map;
- compact metric panel left;
- unified communication stream right;
- gameplay textbox lower area;
- date and timeline top;
- one to three floating map-linked events;
- history access;
- separate Director channel outside the world.

Do not use permanent arena tabs at the top.

Do not create a large control plane.

Do not add a wide category toolbar unless usability testing proves it necessary.

### 18.3 Modes and language

Support intentionally designed light and dark modes.

Persist the preference and respect system default initially.

Every player-facing string must be natural Hebrew and RTL, including:

- labels;
- buttons;
- messages;
- tooltips;
- errors;
- onboarding;
- score;
- replay;
- accessibility labels.

No production English fallback strings.

## 19. Asset policy

Prefer:

- original SVG;
- CSS shapes;
- programmatic overlays;
- licensed icon sets;
- public or appropriately licensed geographic data;
- restrained original illustrations.

Do not copy copyrighted game artwork.

Maintain an asset and map-data license manifest.

## 20. Historical similarity implementation

Create a documented divergence mechanism using factors such as:

- policy;
- timing;
- leadership;
- actor survival;
- hostages;
- territory;
- capability;
- alliances;
- international attitudes;
- knowledge;
- commitments;
- government attention;
- events already changed.

The mechanism need not be a single scalar if a richer representation works better.

Requirements:

- historical path is easy to reproduce when state remains close;
- moderate divergence mutates history;
- deep divergence removes historical privilege;
- no hidden snapback to reality.

## 21. Atlas retrieval

At runtime retrieve several nearby or causally relevant nodes.

The Director may:

- choose one;
- blend them;
- reject them;
- escape.

Record:

- retrieved nodes;
- compatibility assessment;
- selected provenance;
- escape reason.

## 22. Memory and context management

The technical run log is complete.

Model context should use:

- structured current state;
- relevant commitments;
- salient memories;
- retrieved past events;
- condensed history;
- actor-specific memory.

Do not send the full raw log on every call.

Use retrieval, summaries, and stable cached scenario content.

Actor forgetting must be modeled separately from technical storage.

## 23. Randomness

Use a deterministic seeded random service.

Every uncertain execution point should request a named draw with:

- seed lineage;
- distribution or range;
- contextual justification;
- resulting value;
- replay record.

Do not let the language model secretly choose arbitrary dramatic outcomes under the label of randomness.

## 24. Scoring implementation

The final score is generated dynamically by the Director under authored guidelines.

It should be mostly final-state based, with structured inputs for irreversible history.

Potential dimensions include:

- state survival;
- hostage outcome;
- deterrence and enemy confidence;
- enemy military position;
- territory;
- Iran and nuclear risk;
- United States relationship;
- strategic autonomy;
- international standing;
- antisemitism or delegitimization;
- economy;
- state function;
- social cohesion;
- human capital;
- normalization;
- active wars;
- reserve condition;
- future risk.

The Director should explicitly explain why it assigns the score.

Do not reveal weights during play.

Do not tell the player whether decisions were high quality at the time.

## 25. Loss of office

Implement observer mode.

On loss of office:

- remove normal player decision cards;
- run a replacement government policy model;
- continue map and communications;
- accept political/public messages from the former Prime Minister;
- make influence weak and uncertain;
- allow persistent activity to produce delayed effects;
- allow emergent return to office.

## 26. Replay and audit

Replay must not invoke models.

Provide:

### Visual replay

- time-accurate map changes;
- messages;
- events;
- context selection;
- metric movement;
- office changes;
- final score.

### Decision audit

Show structured summaries of:

- state considered;
- actor and available knowledge;
- Atlas retrieval;
- selected action;
- random execution;
- applied effects.

Never show private chain-of-thought.

## 27. Research tooling

Build tools to:

- ingest sources;
- store original language and metadata;
- extract event claims;
- connect claims to snapshots;
- record disagreement;
- update source confidence;
- regenerate affected Atlas nodes;
- prevent future-knowledge leakage;
- run diversity and historical-snapback critics.

## 28. Atlas-generation pipeline

A recommended conceptual pipeline:

1. ingest and index sources;
2. create canonical time-indexed snapshots;
3. reconstruct actor beliefs in native languages;
4. generate capability and dependency graphs;
5. sample strategic state matrices;
6. run blind counterfactual rollouts;
7. run physical/causal validation;
8. run future-leakage critic;
9. run historical-snapback critic;
10. run branch-diversity critic;
11. cluster and compress states;
12. produce runtime retrieval artifacts;
13. generate coverage and confidence reports.

Choose the exact implementation based on experiments.

## 29. Performance and reliability

Targets:

- immediate input and click feedback;
- non-blocking rendering;
- no clock freeze during model calls;
- graceful malformed-output handling;
- bounded context size;
- compact prompts;
- stable-context caching;
- parallel actor calls when safe;
- fallback plans when calls fail;
- fast runtime model path.

Do not call the model every frame.

Determine planning cadence through testing.

## 30. Local runtime

The product must run locally.

Provide:

- documented prerequisites;
- environment example;
- one command for local development;
- one command for production build;
- no committed secrets;
- provider configuration;
- mock or recorded mode.

## 31. Repository deliverables

Produce at least:

- runnable app;
- generic engine;
- scenario package;
- Atlas generator;
- initial Atlas;
- source manifest;
- canonical timeline;
- actor prompts;
- tests;
- replay viewer;
- mock or recorded demo;
- historical-like demo run;
- divergent demo run;
- light and dark screenshots;
- architecture and LLD documentation;
- decision records;
- licenses;
- known limitations;
- calibration report.

A sensible conceptual repository split is:

- `app/`
- `engine/`
- `ai/`
- `atlas/`
- `scenarios/`
- `research/`
- `assets/`
- `tests/`
- `scripts/`
- `docs/`
- `runs/`

The exact structure is an LLD decision.
