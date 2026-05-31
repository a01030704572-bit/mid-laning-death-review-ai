# Mid Lane Coaching Knowledge

This document organizes mid lane coaching concepts for the Mid Laning Decision Review AI.

The goal is not to create a perfect League of Legends textbook.
The goal is to convert coaching knowledge into reusable feedback categories that the AI can use when reviewing mid lane situations.

---

## 0. Core Coaching Philosophy

The AI should not say, "This was definitely the correct play."

Instead, it should:

1. Understand the player's situation.
2. Identify the main coaching category.
3. Separate what was good from what was risky.
4. Explain what information was missing.
5. Give one concrete action for the next game.

The review should feel like a 1:1 coach, not a generic report.

---

## 1. Core Mid Lane Principles

Mid lane decisions are built from several connected concepts:

- CS and farming
- Trading
- Wave state
- Vision
- Jungle tracking
- Roaming
- Recall timing
- Champion matchup
- Map reading
- Tempo

A good review should not only look at the final result.  
It should review the decision flow that led to the result.

Important principles:

- A kill can still have hidden risk.
- Surviving can still be a bad result if the player loses HP, wave, recall timing, or tempo.
- A death can come from multiple small decisions, not one single mistake.
- The player should think about champion matchup, wave state, jungle position, and next action before forcing a play.

---

## 2. Trading and Kill Angles

Trading is the exchange of resources such as HP, mana, cooldowns, summoner spells, wave position, and tempo.

A trade is not automatically good just because the player dealt damage.  
A trade is good when the player gains more value than they lose.

### Trading Types

- Short trade: quick damage and disengage
- Long trade: extended fight with multiple spells or autos
- All-in: committing resources to kill
- Low-cost trade: dealing damage while losing little
- Bad trade: surviving but losing too much HP, wave, tempo, or recall timing

### Action Timer

Players should look for moments when the opponent is forced to act.

Examples:

- Enemy is about to last-hit a cannon minion
- Enemy uses a key spell on the wave
- Enemy walks forward for CS
- Enemy misses a skill
- Enemy has low mana or no important cooldown
- Enemy has no Flash or defensive tool

### Coaching Rules

For a solo kill:

- First identify what enabled the kill.
- Was it enemy cooldown?
- Was it HP/resource advantage?
- Was it wave position?
- Was it matchup pressure?
- Was it enemy overextension?

For survived-but-lost:

- Ask whether the trade was worth the cost.
- If the player lost too much HP, wave, recall timing, or tempo, it may be a bad trade even without death.

For death:

- Ask where the player should have stopped.
- Did the player continue trading after losing the original advantage?
- Did the player ignore enemy jungle, cooldowns, or wave position?

### Related Risk Tags

- KILL_ANGLE_TUNNEL
- COOLDOWN_DISRESPECT
- LOW_HP_STAY
- LOW_RESOURCE_STAY
- BAD_WAVE_POSITION
- NO_FLASH_WINDOW

---

## 3. Wave Management

Wave state is one of the biggest factors in mid lane decision-making.

A wave should be judged by:

1. Wave position
2. Wave size
3. Wave direction
4. Wave timing

### Basic Wave States

- Even state: both waves are similar and meet around mid
- Slow push: one side has a small minion advantage and the wave slowly builds
- Fast push: one side has a large minion advantage and the wave moves quickly
- Freeze: wave is held near one side for a longer period
- Bounce: wave crashes into tower and then returns
- Reset: wave is cleared before the next wave arrives and meets again near center

### Why Wave Matters

Wave state affects:

- Trading timing
- Safety from ganks
- Recall timing
- Roaming windows
- Plate pressure
- CS/XP loss
- Jungle support timing
- Whether the player can move first

### Pushing the Wave

Advantages:

- Enemy must last-hit under tower
- Player can ward
- Player can recall
- Player can roam
- Player can take plate
- Player can move to jungle fight first

Risks:

- Player becomes vulnerable to ganks
- Player is farther from own tower
- Player may overstay for plate
- Player may get punished if enemy jungle is unknown

### Pulling or Holding the Wave

Advantages:

- Safer farming
- Enemy must walk forward
- Ally jungle gank becomes easier
- Can deny enemy all-in or roam timing

Risks:

- Harder to ward
- Harder to roam
- Harder to recall
- Enemy can move first if they crash wave
- Player can lose tempo

### Coaching Rules

If player got a kill:

- Do not only praise the kill.
- Review how the wave should be converted.
- If HP is low and enemy jungle is unknown, safe wave clear and recall is usually more important than plate greed.

If player died:

- Check whether wave position made the death more likely.
- A pushed wave with no vision and no Flash is a high-risk state.

If player survived but lost:

- Check whether trade caused bad recall timing or CS loss.
- A trade that forces a bad recall can be a losing trade.

### Related Risk Tags

- BAD_WAVE_POSITION
- GREEDY_CRASH_ATTEMPT
- CS_GREED
- RECALL_GREED
- UNTRACKED_PUSH

---

## 4. Vision and Warding

A ward is only valuable if it changes the player's decision.

A ward should answer a question.

Good ward questions:

- Where can the enemy jungler gank from?
- Can I push this wave safely?
- Can I move to river first?
- Can I take plate?
- Can I roam?
- Can I prevent enemy roam?

### Warding Principles

- Do not ward without intention.
- Ward timing should match wave state and jungle timing.
- Offensive warding requires lane pressure or ally support.
- Defensive warding is better when behind or pushed in.
- Control wards are useful when they protect a side the player can actually play around.

### Early Warding

Common early warding concepts:

- Level 1 invade defense ward
- Level 2 gank defense ward
- Around 2:30–2:40 ward for level 3 jungle movement
- Raptor or river entrance ward when the player has pressure
- Defensive side ward when the player is pushed in

### Coaching Rules

For unsafe warding death:

- Do not say "warding was bad."
- Say "the intention was good, but the conditions were not safe."
- Identify which condition was missing:
  - Ally nearby?
  - Enemy mid visible?
  - Enemy jungle tracked?
  - Escape path available?
  - Flash/mobility available?

### Related Risk Tags

- PRE_LANE_VISION_RISK
- UNSAFE_WARDING
- NO_RIVER_VISION
- ONE_SIDE_VISION_ONLY
- ENEMY_JUNGLER_UNKNOWN

---

## 5. Jungle Tracking and Gank Risk

Jungle tracking is not only knowing where the jungler is.
It is changing the player's lane behavior based on where the jungler could be.

### Basic Questions

- Where did enemy jungle likely start?
- What clear path is likely?
- What time is the first gank possible?
- Which side is warded?
- Which side should I lean toward?
- Can my champion escape if ganked?
- Is my Flash available?
- Is my wave position dangerous?

### Risk States

High-risk state:

- Wave pushed forward
- No river vision
- Enemy jungle unknown
- No Flash
- Enemy mid has CC
- Player is low HP
- Player is walking into fog alone

### Coaching Rules

If enemy jungle is unknown:

- Avoid long trades near enemy side.
- Avoid deep wards alone.
- Avoid plate greed with low HP.
- Avoid chasing into fog.
- Prefer short trades or safe wave control.

If player gets a kill:

- The kill is not automatically safe.
- Check whether enemy jungle can punish the post-kill action.

If player dies:

- Ask whether jungle location should have changed the play.

### Related Risk Tags

- ENEMY_JUNGLER_UNKNOWN
- OUTDATED_JUNGLE_INFO
- UNTRACKED_PUSH
- POSSIBLE_GANK_SETUP
- MID_JUNGLE_COLLAPSE
- SIDE_PRESSURE_UNTRACKED

---

## 6. Roaming and Tempo

Roaming always has a cost.

The player may lose:

- Minions
- Experience
- Tower HP
- Plate
- Recall timing
- Vision timing
- Lane priority
- Tempo

A roam is good only if the expected reward is worth what the player gives up.

### Roam Checklist

Before roaming, check:

- Did I push the wave?
- Will I lose a big wave?
- Can enemy mid punish my roam?
- Are side lane enemies low HP?
- Does my champion have enough damage or CC?
- Is ally jungle nearby?
- Where is enemy jungle?
- Are summoner spells available?
- Is there an objective after the roam?
- Do I need to reset instead?

### Coaching Rules

If player roamed:

- Review what they gave up.
- Review whether the reward justified the cost.
- Review whether wave state allowed the roam.

If player did not roam:

- Review whether they could have converted priority.
- Sometimes taking plate, recall, or vision is better than roam.

### Related Risk Tags

- SIDE_PRESSURE_UNTRACKED
- MID_JUNGLE_COLLAPSE
- RECALL_GREED
- UNTRACKED_PUSH

---

## 7. Recall, Tempo, and Advantage Conversion

A lead is not fully real until it is converted.

Common advantage sources:

- Solo kill
- Forced enemy recall
- Lane priority
- CS lead
- Plate
- Enemy summoner spell burned
- Enemy key cooldown burned
- Enemy low HP/mana

Common conversion options:

- Push wave
- Recall
- Take plate
- Ward
- Roam
- Help jungle
- Set up objective
- Freeze or deny CS

### Post-Kill Decision Priority

After a solo kill, check:

1. My HP
2. My key cooldowns
3. My Flash/mobility
4. Wave state
5. Enemy jungle position
6. Enemy respawn timer
7. Plate opportunity
8. Recall value

### Coaching Rules

For advantage outcomes:

- Start with how the advantage was created.
- Then explain how to convert it.
- Hidden risks should be secondary, not the whole review.

For death after advantage:

- Ask whether player greeded after the advantage.
- Did they take plate when recall was safer?
- Did they stay with low HP and no vision?

### Related Risk Tags

- KILL_ANGLE_TUNNEL
- RECALL_GREED
- GREEDY_CRASH_ATTEMPT
- NO_RIVER_VISION
- ENEMY_JUNGLER_UNKNOWN
- NO_FLASH_WINDOW

---

## 8. Champion Identity and Matchup Knowledge

Champion identity should guide the review, but it should not create overconfident conclusions.

Matchup knowledge should be used as a hint, not a guaranteed truth.

### Champion Identity Types

#### Assassin

Examples:

- Akali
- Zed
- Talon
- Fizz
- Qiyana

Common traits:

- Looks for cooldown windows
- Wants burst or all-in timing
- Often stronger after level 6
- Can punish enemy key spell mistakes
- Can struggle when wave is bad or enemy has control tools

#### Control Mage

Examples:

- Orianna
- Viktor
- Azir
- Anivia
- Syndra

Common traits:

- Wants spacing
- Wants wave control
- Wants poke or short trades
- Can control lane with range
- Can be punished when key spell or positioning is bad

#### Skirmisher / Melee Carry

Examples:

- Yone
- Yasuo
- Sylas
- Irelia

Common traits:

- Likes extended fights
- Uses mobility or repeated trading
- Can punish mistakes hard
- Can overextend easily
- Often needs wave and jungle awareness

#### Roaming Mid

Examples:

- Twisted Fate
- Taliyah
- Galio
- Talon
- Qiyana

Common traits:

- Wants wave push into movement
- Wants tempo advantage
- Can impact side lanes
- Can lose value if stuck under tower

### Matchup Knowledge Rules

Use matchup info only to ask better questions.

Good:

> In this matchup, the important question is whether Viktor's key defensive spell was already down before Akali entered.

Bad:

> Akali always wins this matchup after level 6.

### Matchup Questions

- Who controls wave early?
- Who has range advantage?
- Who has stronger level 3?
- Who has stronger level 6?
- Which spell decides the trade?
- Who wins short trade?
- Who wins long trade?
- Who gets punished harder by jungle gank?
- Who has better post-kill conversion?

---

## 9. Category Mapping Rules

### WAVE_MANAGEMENT

Trigger when:

- laneState mentions enemy tower, own tower, center, slow push, freeze, crash
- reviewFocus mentions wave, recall, plate, CS
- risk tags include BAD_WAVE_POSITION, CS_GREED, GREEDY_CRASH_ATTEMPT

### TRADING_KILL_ANGLE

Trigger when:

- beforeAction mentions trading, kill angle, enemy skill down
- currentOutcome is solo_kill or survived_but_lost
- risk tags include KILL_ANGLE_TUNNEL, COOLDOWN_DISRESPECT, LOW_HP_STAY

### VISION_WARDING

Trigger when:

- visionState says no river vision or one-side vision
- beforeAction mentions warding
- risk tags include UNSAFE_WARDING, NO_RIVER_VISION, PRE_LANE_VISION_RISK

### JUNGLE_TRACKING

Trigger when:

- enemyJungleLocation is unknown or outdated
- risk tags include ENEMY_JUNGLER_UNKNOWN, OUTDATED_JUNGLE_INFO, UNTRACKED_PUSH, POSSIBLE_GANK_SETUP

### ROAMING_TEMPO

Trigger when:

- beforeAction mentions roaming or moving from lane
- reviewFocus mentions roam/objective
- risk tags include SIDE_PRESSURE_UNTRACKED or MID_JUNGLE_COLLAPSE

### RECALL_TEMPO

Trigger when:

- reviewFocus mentions recall
- freeDescription mentions low HP, gold, reset, item timing
- risk tags include RECALL_GREED

### ADVANTAGE_CONVERSION

Trigger when:

- currentOutcome is solo_kill, forced_enemy_recall, gained_lane_priority, plate_or_cs_gain
- reviewFocus mentions advantage conversion, plate, vision, priority, next action

### MATCHUP_KNOWLEDGE

Trigger when:

- champion names are provided
- freeDescription mentions matchup
- beforeAction mentions enemy key spell
- reviewFocus mentions kill angle or trade

---

## 10. Level 3 Implementation Notes

The app should not put all of this knowledge directly into one huge prompt.

Instead:

1. Detect relevant coaching categories.
2. Attach only short category-specific coaching hints.
3. Generate feedback based on current outcome, review focus, risk tags, and relevant categories.

Planned files:

```text
lib/coachingCategories.ts
lib/coachingCategoryMapper.ts
lib/coachingKnowledge.ts
docs/coaching-knowledge.md
docs/test-cases.md
docs/evaluation-checklist.md