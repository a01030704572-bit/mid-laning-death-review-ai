# Level 6-A Coaching Metrics Schema

## Product Direction

The current manual input form is temporary labeling and schema tooling. The final product should behave more like an automated solo queue coaching system: Riot API evidence, gameplay video analysis, and app history should classify scenes and surface the biggest repeated mistake with one clear next-game goal.

Manual confirmation should remain optional and minimal. It can help resolve uncertainty, but it should not be the primary data source.

## Tier-Adjusted Coaching Depth

- Iron/Silver: simple survival and action rules, such as not fighting without Flash or not walking into fog alone.
- Gold/Platinum: lane state, jungle/support location, recall timing, and objective timing become part of the decision.
- Emerald/Diamond: wave crash, tempo, cover, and objective setup are reviewed as connected systems.
- Master+: expected value, opportunity cost, jungle/support tempo, and objective tradeoffs become the main coaching language.

## Core Coaching Concepts

The schema defines stable concepts for wave management, jungle tracking, support roam timing, recall timing, vision, trading/positioning, objective setup, and kill-to-value conversion.

Each metric converts a human coaching idea into automation-friendly signals:

- Riot signals: objective events, deaths, kills, plates, CS/XP/gold deltas.
- Video signals: visible wave state, movement direction, fog entry, visible resources, minimap cues.
- App history signals: repeated risk tags and repeated scenario classes.

## Scene Scenario Taxonomy

`SCENE_SCENARIOS` defines common mid lane review situations such as ganked while pushing, enemy support roam collapse, unsafe warding, failed solo kill attempts, poor solo-kill conversion, death before objective, and bad recall before objective.

The scenario list is not the final decision engine. It is a stable taxonomy for future automated classification.

## Habit Pattern Rules

`HABIT_PATTERNS` defines repeated mistakes using risk tags, scenario IDs, and simple thresholds. The MVP default is a recent-game window with a minimum occurrence count. These patterns should later power the "biggest repeated mistake" and one next-game goal.

## Evidence Trust Rules

Riot API should be treated as the source of truth for objective events, kills, deaths, turret plates, and numeric deltas when available.

Video analysis should be used for visual and spatial cues: wave position, movement path, fog entry, visible resources, and apparent fight direction.

Video AI must not be trusted blindly for subjective claims such as player intent, exact jungle pathing outside the frame, or why the player fought.

App history should be used for repeated pattern detection, not as proof that a specific new scene has the same cause.

User confirmation is useful for resolving ambiguity but should remain optional and small.

## MVP Priorities

High-priority MVP coverage focuses on:

- ganked while pushing
- unknown enemy jungler fights
- enemy support roam collapse
- unsafe warding into fog
- bad objective recall or death before objective
- poor solo-kill conversion
- fighting without Flash or escape tools

Lower-priority cases, such as side lane overextension, remain in the taxonomy but do not need immediate UI or prompt integration.

## Future Integration Points

This schema should later connect to:

- evidence package summarization
- automated scene classification
- tier-adjusted coaching output
- repeated habit analysis
- next-game goal selection

Do not inject this schema into AI prompts until the automated evidence and classification boundary is stable.
