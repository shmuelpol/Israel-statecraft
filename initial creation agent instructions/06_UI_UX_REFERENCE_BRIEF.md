# UI and UX Reference Brief

## 1. Visual objective

The interface should feel like a polished, pleasant strategy game whose underlying simulation is much deeper than its surface complexity suggests.

The desired fusion is:

- the clarity, friendliness, and event-window logic of older browser and Flash-era management games;
- modern spacing, typography, responsiveness, and interaction feedback;
- a lightly illustrated strategic map;
- restrained seriousness appropriate to war and hostages.

The target is not literal retro design.

The target is not a modern military dashboard.

## 2. Avoid

Avoid visual language associated with:

- Call of Duty;
- command-and-control military software;
- black steel panels;
- neon tactical HUDs;
- camouflage;
- night vision;
- photorealistic weapons;
- permanent red-alert styling;
- financial terminals;
- dozens of map unit markers;
- a giant control plane;
- permanent arena tabs across the top;
- a bottom toolbar that forces the Prime Minister to choose a software category before acting.

## 3. Prefer

Prefer:

- a calm illustrated or lightly textured map;
- warm, neutral, or soft cool surfaces;
- rounded event windows;
- clear borders;
- restrained shadows;
- modest gradients;
- simple icons;
- gentle motion;
- generous negative space;
- low permanent map clutter;
- visually distinct but not alarming event cards;
- highly legible Hebrew typography;
- obvious clickability.

## 4. Core layout

The intended default desktop layout is:

### Center

A large interactive regional map.

The map is the navigation system and the main world-state display.

### Left

A compact list of approximately ten qualitative metrics.

Each metric is clickable and may be expanded.

### Right

A unified communication feed that feels like government messaging rather than a military terminal.

Possible senders include:

- Chief of Staff;
- national security adviser;
- intelligence;
- foreign government;
- opposition;
- public reaction;
- enemy spokesperson;
- media.

### Lower area

One large gameplay input with a simple Hebrew instruction equivalent to:

- What do you want to do?
- Write an instruction, question, or statement.

### Top

Date, time progression, scenario title, light/dark mode, and minimal utilities.

Do not add front tabs.

### Outside the world interface

A separate Game Director discussion channel.

It must not look like another adviser inside the government.

## 5. Map interaction

Clicking a region should:

- create a restrained outline or halo;
- add it to the current message context;
- avoid opening a permanent arena panel by default.

Clicking Gaza, Lebanon, Syria, Iran, the West Bank, the United States relationship metric, or a communication message should use the same contextual interaction model.

The Golan Heights must look like a direct continuation of Israel without special indication.

The West Bank should be separately legible.

## 6. Event interaction

Important events appear over the map as floating cards connected to their geographic origin.

Flow:

1. a map location signals an event;
2. a floating actionable card appears;
3. the player selects a predefined action, asks a question, writes a custom instruction, or does nothing;
4. the card later disappears;
5. results and discussion enter the communication stream;
6. the map and metrics change over time.

Cards should not feel like tactical unit panels.

A card may use a simple illustrated icon and a distinct border color, but avoid making every event a red emergency.

## 7. Light and dark modes

Both modes must be designed intentionally.

### Light mode

Suggested direction:

- parchment, cream, light blue, muted sand, pale gray;
- readable dark text;
- illustrated map colors;
- subtle shadows;
- event cards with controlled saturation.

### Dark mode

Suggested direction:

- deep navy or charcoal rather than pure black;
- warm off-white text;
- map remains colorful enough to read;
- avoid neon and tactical green;
- maintain the same calm game-like feeling.

## 8. Interpreting the included images

The image files are conceptual references. Their generated Hebrew text is not authoritative and must not be copied.

### `01_fusion_light_mode_direction.png`

Useful for:

- overall light-mode calmness;
- map prominence;
- rounded surfaces;
- approachable tone;
- event cards over geography.

Do not copy:

- excessive permanent category buttons;
- exact density;
- any generated labels.

### `02_flash_era_event_cards_direction.png`

Useful for:

- old browser-game friendliness;
- simple illustrated map;
- floating decision windows;
- bold readable event hierarchy.

Modernize:

- typography;
- spacing;
- icon consistency;
- responsiveness;
- information architecture.

### `03_clickable_context_direction.png`

Useful for:

- the idea that everything is clickable context;
- selected metrics, messages, and map areas feeding natural-language action;
- a large map and side communication stream.

Avoid:

- military-terminal density;
- unnecessary bottom category toolbar;
- excessive framing.

### `04_map_linked_action_cards_direction.png`

Useful for:

- simultaneous map-linked cards;
- geographic relationship between event and decision;
- communication feed as result channel.

Avoid:

- dark tactical-dashboard style;
- too many permanent controls;
- overly dense Atlas explanatory content inside the game UI.

### `05_dense_dashboard_avoid_overuse.png`

This is primarily an anti-reference.

It demonstrates:

- how the interface can become too much like a military command dashboard;
- how permanent resources and panels can overwhelm the map;
- how excessive density creates fatigue.

Salvage only:

- map-linked crises;
- unified event visibility;
- one lower input.

### `06_original_command_center_avoid_style.png`

This is an anti-reference for the final aesthetic.

It may help understand the first conceptual information layout, but the final product should not use its command-center visual language.

### `07_user_shared_reference.png`

Use as discussion context only.

Extract:

- the user's preference for a map-centered game;
- compact metrics;
- events as strategic decisions;
- real-time timeline.

Do not copy its exact control-plane structure.

## 9. Visual iteration process

Perform several UI passes.

For each pass:

1. build a representative live screen rather than a static Figma-only frame;
2. test light and dark modes;
3. render calm, normal, and crisis states;
4. ask whether the map still dominates;
5. ask whether event cards clearly connect to geography;
6. ask whether the interface feels like a game rather than enterprise software;
7. remove controls that can be expressed through natural language;
8. check that the screen remains pleasant for repeated eight-minute runs;
9. check Hebrew RTL with real production strings;
10. test context selection without relying on explanatory labels.

## 10. Accessibility and readability

Requirements include:

- sufficient contrast in both themes;
- no reliance on color alone for urgency;
- keyboard access to selectable elements;
- screen-reader labels in Hebrew;
- clear focus state;
- scalable text;
- motion reduction support;
- no important information hidden only in hover;
- readable event cards at common desktop sizes.
