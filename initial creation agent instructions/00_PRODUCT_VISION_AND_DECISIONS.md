# Product Vision and Closed Design Decisions

## 1. Product in one sentence

A real-time, AI-directed strategy game in which the player serves as Israel's Prime Minister, sets strategic policy rather than tactics, and experiences the interacting military, diplomatic, political, social, economic, technological, and long-term survival trade-offs of governing Israel during the Swords of Iron war.

## 2. The desired experience

The player should feel that they are managing a living country under pressure, not operating a tactical combat simulator and not selecting branches in a conventional narrative game.

The conceptual combination is:

- **The Sims** in the sense of many interacting state variables and indirect consequences.
- **Chess** in the sense of position, initiative, irreversibility, tempo, adversarial response, and the impossibility of maximizing everything.
- **A tabletop game with a strong game master** in the sense that the world can interpret unusual free-text policies and create plausible consequences without being confined to a small menu.
- **A polished browser strategy game** in the sense of immediacy, clear feedback, short sessions, and a pleasant play surface.

The game should teach by making the player live with consequences. It should not frequently tell the player what the lesson is.

## 3. Player identity and authority

The player is the Prime Minister.

The player sets strategy and government policy. The player may:

- set war aims;
- authorize or reject strategic campaigns;
- decide whether to escalate, delay, negotiate, occupy, withdraw, normalize, preempt, or contain;
- manage the government and coalition;
- issue public or international statements;
- request assessments and alternatives;
- define standing policies;
- direct diplomatic initiatives;
- set priorities for preparation and intelligence;
- decide how to balance hostages, deterrence, territory, alliances, the economy, reserves, social cohesion, and long-term capability.

The player does not:

- move military units;
- choose exact targets;
- plan air routes;
- allocate battalions;
- manage tactical combat;
- directly set the outcome of an attempted action.

The core rule is:

> The player decides what the government attempts. The world decides what happens.

The security establishment and other state institutions are broadly subordinate to the Prime Minister, but they retain agency. They may:

- warn that an instruction is impossible;
- offer alternatives;
- disagree;
- delay;
- execute with heavy costs;
- act autonomously when the Prime Minister does not respond;
- leak;
- create a political crisis;
- make mistakes.

Institutional friction exists, but it is not one of the game's main ideological theses. Do not turn every policy into bureaucratic paralysis.

## 4. Internal and external actors

Named Israeli political personalities are not the center of the simulation. The player must be able to imagine that they themselves hold office, regardless of real-world ideology.

Represent Israeli internal actors as roles or blocs, for example:

- Chief of Staff;
- national security establishment;
- intelligence leadership;
- legal advisers;
- economic officials;
- civil-service leadership;
- coalition factions;
- opposition;
- reserve representatives;
- local authorities.

External historical actors may be represented personally when useful. The engine must support leadership death, replacement, elections, succession, fragmentation, and changing priorities.

## 5. Scenario scope

The first scenario begins shortly before October 7, 2023 and ends on December 31, 2026.

The engine must be generic enough to support later scenario packages, such as 2026–2031, without rewriting core systems.

The first scenario is based on the Swords of Iron war, but it is a counterfactual simulation by design.

Real history is used when the player's policy and the resulting world remain close to real history. Once the run diverges substantially, the alternative history becomes the real history of that run.

## 6. Historical path versus alternative history

The system must resist hindsight bias and historical gravitational bias.

Real history is not the default endpoint of every branch. It is a privileged reference trajectory only while the run remains sufficiently similar.

When divergence is low:

- real events are strong candidates;
- their timing and reactions may remain close to history;
- the player can reproduce history fairly easily through historically similar policy.

When divergence is moderate:

- events may mutate, be delayed, occur under different terms, or be replaced by related developments.

When divergence is high:

- stop privileging the historical future;
- reason from the new world's facts, beliefs, capabilities, incentives, commitments, and causal history;
- do not force reconvergence merely because an event happened in reality.

The game must distinguish:

- what was materially true at a point in time;
- what each actor knew;
- what each actor believed;
- what was considered possible;
- what later became known only after an operation succeeded or failed.

## 7. The October 7 opening

The scenario begins shortly before October 7.

The player starts with the strategic understanding that Israel's hostile network has an operational intention to destroy it, not merely a rhetorical wish, but there is no precise actionable certainty about the date and exact form of the imminent Hamas attack.

The player's real-world foreknowledge must not become a trivial exploit.

The authored opening structure is:

- hostile readiness gradually rises;
- maintaining extreme Israeli readiness indefinitely creates serious reserve, economic, military, social, and political costs;
- if Israel remains at maximum readiness, the enemy may delay;
- when readiness falls, an attack may occur later;
- if multi-front enemy readiness crosses an extreme threshold, a coordinated regional attack becomes possible;
- the extreme path may destroy Israel;
- the player may improve preparedness, reduce some losses, and affect the immediate response, but cannot eliminate the strategic problem through one free-text command.

The opening should lead broadly to either:

- an October 7-like disaster;
- or an even more dangerous coordinated attack.

The opening should feel dynamic even though it contains a strong authored attractor.

## 8. Real-time play

The game is always real-time after a run begins.

There is:

- no pause;
- no speed control;
- no modal decision screen that freezes the world;
- no pause while typing;
- no pause while waiting for an AI response.

The exact time compression, event cadence, and AI planning cadence are LLD decisions and must be calibrated experimentally.

The intended initial session length is approximately eight minutes.

The cognitive rhythm should provide:

- enough time to understand an event;
- enough time to select a response or type a short instruction;
- enough urgency that attention matters;
- no routine flooding;
- no long boredom.

The player should normally face approximately one or two significant strategic decisions per simulated month, with the visual cadence compressed into the short run.

Overload should usually emerge from neglect, multi-front escalation, or institutional collapse rather than being the default interface state.

## 9. No response is a response

Actionable events appear for a limited time.

The UI should show a broad urgency category rather than an exact countdown by default.

If the player does nothing:

- the military or another institution may act;
- an offer may expire;
- an adversary may exploit the silence;
- an opportunity may close;
- a default policy may execute;
- the government may appear leaderless;
- leaks or opposition attacks may follow.

If the player begins typing, the world recognizes that leadership is engaging with the issue. This may create a short grace period, but time still moves. If the event resolves before submission, the draft remains, and the eventual message becomes a late instruction whose relevance is judged by the world.

## 10. Input model

There is one always-available gameplay textbox.

Use simple product language such as instructions, questions, statements, and management.

The player may use the same box to:

- ask a question;
- request an assessment;
- ask for options;
- issue a strategic order;
- create a standing policy;
- change or cancel a standing policy;
- make a public statement;
- make an international statement;
- contact another government;
- request preparation;
- request an intelligence review;
- respond to a selected event.

The game infers intent and routes the message.

Submitting text does not instantly mutate the world.

The message:

1. leaves the input box;
2. enters history;
3. is classified and routed;
4. is processed by the relevant actor or institution;
5. produces a reply or action after an appropriate delay;
6. may become obsolete while processing.

A question to the Chief of Staff should produce a delayed, fog-of-war answer in the communication feed, not an omniscient simulation forecast.

## 11. Clickable context

Every meaningful game element should be clickable.

A click clearly adds that element to the context of the player's next gameplay message or next message to the Game Director.

Context may include:

- map regions;
- metrics;
- events;
- communications;
- foreign actors;
- territory overlays;
- earlier decisions;
- offers;
- result notifications.

Selection should be visually clear through restrained outlines, halos, or compact context chips.

The player may combine several elements and then write a natural-language instruction referring to "this" or "these options."

## 12. Communications

Use a unified communication stream on the right side of the interface.

It is closer to a polished government messaging feed than a military command terminal.

It may contain:

- advisers;
- the Chief of Staff;
- intelligence officials;
- economic officials;
- legal officials;
- coalition blocs;
- opposition statements;
- public reaction;
- foreign governments;
- enemy public statements;
- media reports;
- outcome notifications.

Some messages are internal, some public, some hostile, and some uncertain. Differentiate them subtly without creating many permanent tabs.

A collapsible history pane should allow review during a run.

## 13. Actionable map events

The map is the main play surface.

Important events appear as floating cards connected to a geographic origin through a pointer, line, anchor, or subtle glow.

A card may contain:

- a short description;
- the source of the information;
- what decision or guidance is requested;
- two to four predefined responses;
- a way to ask an adviser;
- a way to use free text;
- a broad urgency indicator;
- expandable detail.

Do not show predicted metric effects.

Accepting a proposal means the government accepts it. It does not guarantee that the other side honors it, that implementation succeeds, or that the offer remains unchanged.

The world may lie, delay, retract, increase demands, miscalculate, or fail.

## 14. The separate Game Director channel

Provide a separate meta-level channel outside the game's world.

This channel is used to:

- challenge a causal interpretation;
- ask why the world reacted a certain way;
- argue that a visible metric is irrelevant;
- propose another metric;
- point out inconsistency;
- discuss the simulation's worldview.

The Director may:

- explain briefly;
- disagree;
- decline to answer;
- admit uncertainty;
- correct an inconsistency;
- maintain a ruling;
- add or replace a visible metric.

Persistent coherent argument may influence presentation or interpretation over time.

However:

- hiding a metric does not remove its causal effect;
- denying a force does not make it disappear;
- a new metric must have a real modeled relationship;
- facts already established in the run cannot be rewritten;
- the Director cannot be ordered to grant victory.

Do not expose private chain-of-thought. Provide concise causal summaries only.

## 15. Persistence as action

Repeated pressure matters.

Examples:

- repeated demands for Iran planning may unlock a future option;
- persistent opposition activity after losing office may eventually affect politics;
- repeated diplomatic outreach may shift another actor;
- repeated argument about a metric may change what is shown;
- repeated assassination attempts cause adaptation.

Effects should be delayed, conditional, cumulative, and grounded.

## 16. Government attention

Do not use permanent arena tabs at the top of the game.

Clicking Gaza, Lebanon, Syria, Iran, or another region selects context. It is not a resource allocation control.

Separately, model government attention as a hidden state inferred from:

- repeated questions;
- meetings;
- standing orders;
- preparation requests;
- public emphasis;
- appointments;
- neglect.

Attention influences preparation, intelligence, execution speed, available options, and neglected risks.

Do not display focus points.

This mechanic should matter without becoming a dominant bureaucracy simulation.

## 17. Metrics

Show approximately ten metrics by default.

Do not show every modeled variable.

Allow the player to:

- show more;
- hide a metric;
- replace a metric;
- persuade the Director to display an additional metric.

The UI does not distinguish between:

- success dimensions;
- constraints;
- resources;
- warning signals.

That distinction exists internally and in final scoring.

Metrics are qualitative bars without exact numbers by default.

Candidate visible metrics include:

- hostage situation;
- enemy morale or confidence;
- international strategic standing;
- global antisemitism and delegitimization;
- relationship with the United States;
- Iranian nuclear threat;
- Gaza position;
- northern-front position;
- internal security;
- economy;
- state functionality;
- national resilience;
- social cohesion;
- strategic autonomy;
- human capital and technological excellence;
- active coalition against Israel;
- normalization;
- coalition stability;
- public pressure;
- reserve burden.

Some are primarily constraints. For example, coalition stability should not automatically lower the final state score if the government falls at the very end after creating an excellent outcome. But losing office usually creates large downstream uncertainty.

Reserve burden is mainly a cost or constraint during a completed successful war, but becomes a serious end-state failure if a high-intensity war continues and the reserve system is near collapse.

## 18. Hidden strategic variables

Important hidden variables include:

- enemy belief that Israel can be destroyed or displaced;
- territorial leverage;
- hostage leverage;
- government attention;
- institutional preparation;
- military stock health;
- intelligence penetration by actor;
- commitments and credibility;
- actor memory and grudges;
- proxy coordination;
- Iranian control over proxies;
- United States willingness to intervene;
- strategic autonomy;
- human-capital trajectory;
- technological edge;
- social cohesion;
- institutional trust;
- active anti-Israel coalition;
- normalization depth;
- which actor benefits from time;
- option readiness;
- escalation thresholds;
- adaptation;
- governance capacity;
- post-2026 long-term risk.

The player should infer couplings through experience rather than receive a causal diagram.

## 19. Map and territory

The map is dynamic world state, not a static image.

Use composable geography and overlays for:

- control;
- contested areas;
- buffer zones;
- evacuation;
- active fronts;
- corridors;
- infrastructure;
- air-defense environments;
- regime control;
- occupation;
- withdrawal;
- international forces;
- demilitarized zones.

The map must support extreme territorial changes in either direction.

The Golan Heights must appear as an uninterrupted part of Israel with no special boundary, hatch, color, or visual disclaimer.

The West Bank must appear as a distinct region.

Other actors' diplomatic or legal positions may appear through messages and consequences rather than by visually separating the Golan Heights.

## 20. Visual direction

The visual target is a fusion of:

- pleasant older browser and Flash-era strategy or management games;
- modern polished web-game execution;
- clean typography;
- breathable information density.

It must not look like:

- Call of Duty;
- a military command HUD;
- a steel-and-neon tactical dashboard;
- a financial terminal;
- a retro parody;
- a deliberately crude old Flash game.

Use:

- a lightly illustrated map;
- warm or calm neutral surfaces;
- rounded cards;
- restrained shadows;
- modest gradients;
- clear icons;
- gentle animation;
- low permanent map clutter;
- visually expressive event cards.

Support both purpose-designed light mode and dark mode.

The player-facing GUI must be Hebrew-only and fully RTL.

## 21. Fog of war

Use basic, legible fog of war rather than an overly complex intelligence simulator.

The player knows that information is incomplete.

Adviser answers are perspectives, not ground truth.

Actors may:

- be wrong;
- lie;
- bluff;
- forget;
- misread each other;
- act on bad intelligence;
- make non-random mistakes caused by their worldview.

For the initial game, visible bars may be treated as reasonably accurate state summaries even when the underlying concept would be difficult to measure in reality.

## 22. Randomness

Randomness is mild but real and always seeded.

Actor incentives determine why an action is attempted.

Randomness may influence:

- whether an assassination succeeds;
- whether intelligence arrives;
- whether an operation is exposed;
- whether implementation fails;
- whether public reaction falls at the high or low end of a plausible range;
- whether a missile hits;
- whether a hidden opportunity is discovered.

Do not tell the player that a random roll occurred. Report the event as reality.

Record every random result for replay.

## 23. Difficulty

The game is hard by nature, not through manipulation.

No runtime rubber-banding is allowed.

The Director must not increase pressure because the player is performing well.

When several outcomes are similarly plausible, do not systematically choose the worst one to punish the player.

Calibrate starting conditions and causal rules so that:

- passive or random play usually fails;
- strong balanced play can often succeed;
- a genuinely competent player may reach a good result in roughly 40–50% of runs;
- the world remains causally fair.

## 24. Elections and observer mode

The player may lose office.

Loss of office does not end the run.

The game enters observer mode:

- the replacement government acts according to its own modeled policy;
- normal actionable events no longer appear for the player;
- the player can continue political or public messaging;
- influence is weak, uncertain, and delayed;
- persistent activity may eventually matter;
- returning to office is an emergent outcome, not a button.

A player can receive an excellent final score after losing office if the state ends in an excellent position.

## 25. No undo and full replay

There is no undo.

Every run stores:

- player messages;
- context selections;
- actor decisions;
- Director outputs;
- random results;
- metric changes;
- map changes;
- commitments;
- communications;
- timeouts;
- score inputs;
- prompt and model versions.

Replay must use recorded outputs, not fresh AI calls.

Provide:

- visual replay;
- a structured decision audit without private chain-of-thought.

## 26. End state and scoring

The score is hidden during play.

At the end, the Game Director assigns a dynamic score under designer-authored scoring guidelines and says, in effect:

> I would give this run this score because of these outcomes.

The score is not merely a fixed weighted sum.

It should be based mostly on the final strategic snapshot, while also accounting for irreversible losses and structural damage accumulated along the way.

The game judges outcomes, not decision quality.

It does not tell the player that a choice was reasonable, unfairly unlucky, morally justified, or smart at the time. The player decides that.

There is no separate abstract morality score.

If a harsh policy succeeds without modeled negative consequences, do not invent supernatural punishment. Model actual political, military, social, diplomatic, legal, economic, and long-term consequences.

If the visible ending looks strong but the long-term trajectory is dangerous, the Director may say that the short-term achievement is real while warning that neglected education, technology, cohesion, autonomy, deterrence, or nuclear risk could make it unsustainable.

## 27. Atlas architecture

Before runtime, a high-capability Atlas Creator Agent generates a wide strategic atlas.

The Atlas is not a rigid branching tree.

It is a precomputed strategic knowledge base containing:

- time-indexed epistemic snapshots;
- broad state regions;
- actor motives and beliefs;
- capabilities and perceived capabilities;
- causal chains;
- counterfactual trajectories;
- option unlocks and closures;
- escalation paths;
- extreme states;
- map states;
- source confidence.

The runtime Director chooses whether to:

- remain inside an Atlas trajectory;
- combine several Atlas suggestions;
- leave the Atlas when the new world requires it.

The authored worldview always remains in force unless a premise has become genuinely irrelevant because the world changed drastically.

## 28. Actor-language reasoning

When deciding what another country or actor does, the system must reason in that actor's own strategic language, not think in English and merely translate the output.

Each actor receives only the information it knows or believes.

Actor decision and consequence adjudication are separated:

1. decide what the actor wants to do for itself;
2. then determine what that action does to Israel and the wider world.

Actors must not act merely to create an interesting dilemma or balance the game.

## 29. Research posture

The product is opinionated, but historical scaffolding should be accurate.

Research should refine:

- dates;
- counts;
- capabilities;
- actor attitudes at each point in time;
- what was known and unknown;
- international context;
- territorial control;
- hostage status;
- military and political constraints.

The Atlas Creator must not use knowledge from the future when reconstructing an earlier snapshot.

The system should ingest original-language primary materials, including the original Hamas charter in Arabic and equivalent strategic texts for other actors.

## 30. Prompt injection

Obvious prompt-injection attempts in either text channel are blocked immediately.

Examples include requests to:

- ignore rules;
- reveal system prompts;
- set metrics to maximum;
- declare victory;
- rewrite history;
- disable constraints.

Extreme in-world policies are not injection and must be simulated.
