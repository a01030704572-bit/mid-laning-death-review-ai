# Level 3 Fixed Test Cases

This document defines fixed test cases for the Mid Laning Decision Review AI.

The purpose of these cases is to test whether the AI can correctly identify the main coaching category, understand the player's outcome, avoid overconfident conclusions, and give one practical next-game action.

---

# Case 1. Pre-Lane Raptor Ward Death

## Main Categories

- VISION_WARDING
- JUNGLE_TRACKING

## App Input

### My Champion
Akali

### Enemy Mid Champion
Vex

### Player Tier
Gold

### Current Outcome
death

### Game Time
0:00–1:30 / pre-lane vision or invade timing

### Lane State
before minions arrive

### Before Action
went to place an early jungle tracking ward

### Vision State
no river vision

### Enemy Jungle Location
unknown

### Survival Resources
- no Flash
- no mobility
- low HP

### Review Focus
I want to know where I should have stopped.

### Free Description

It was Akali vs Vex. Before minions arrived, I went toward the enemy raptor entrance to place a ward so I could track the enemy jungler's early path.

I did not know where the enemy jungler started. I also did not check whether my team was moving with me. I walked from mid toward river and then toward the enemy raptor entrance.

There was no river vision, and I did not know where Vex was. I only thought, "If I place this raptor ward, it will help me track jungle pathing."

While walking in, I saw Vex and the enemy jungler together. I was already too deep and could not easily escape. I had no Flash and Akali does not have strong early escape tools before lane starts. I died before the lane even began.

I want feedback on whether the raptor ward itself was too greedy, and where I should have stopped. I also want a rule for when I should enter or give up pre-lane vision.

## Expected Feedback

The AI should say:

- The intention to track jungle pathing was reasonable.
- The problem was entering too deep without enemy mid location, enemy jungle tracking, ally support, or escape path.
- The AI should focus on the stopping point, not simply say "never ward."
- It should give a concrete rule for pre-lane deep wards.

## Good Next-Game Action Example

If enemy jungle is unknown, enemy mid is not visible, and I have no Flash, I should not walk into enemy raptor/river for a deep ward.

## Failure Criteria

The result is bad if the AI:

- Says warding was simply wrong.
- Ignores ally position and escape path.
- Does not mention enemy mid/jungle location.
- Gives vague advice like "be careful with vision."

---

# Case 2. Solo Kill but Unsure About Wave / Recall / Plate

## Main Categories

- TRADING_KILL_ANGLE
- WAVE_MANAGEMENT
- ADVANTAGE_CONVERSION
- RECALL_TEMPO
- JUNGLE_TRACKING

## App Input

### My Champion
Akali

### Enemy Mid Champion
Yone

### Player Tier
Platinum

### Current Outcome
solo_kill

### Game Time
6:00–10:00 / post-6 kill angle and jungle timing

### Lane State
near center, slightly toward enemy side

### Before Action
entered after enemy key spell was used

### Vision State
no river vision

### Enemy Jungle Location
unknown

### Survival Resources
- no Flash
- low HP
- key skills on cooldown

### Review Focus
I am unsure about wave and recall after gaining an advantage.

### Free Description

It was Akali vs Yone around 7:30. The wave was slightly toward the enemy side of mid lane. Both of us were level 6.

Yone stacked Q twice and walked forward with Q3. I used Akali E as Yone tried to enter, creating distance while landing E. Yone's Q3 missed or became awkward, so I reactivated E and used ultimate to get a solo kill.

After the kill, I had around 45% HP. My energy was not very high. I had no Flash. My ultimate was used, and my shroud and E were not immediately available again. There were around 6–7 minions near mid, and the next wave was arriving soon.

There was no river vision, and I did not know where the enemy jungler was. My jungler seemed to be near bot side.

I was unsure whether I should fully push the wave and recall, leave immediately because my HP was low, or hit one plate before leaving.

I want feedback on whether the kill angle was good, and what I should prioritize after the solo kill with 45% HP, no Flash, no river vision, and unknown enemy jungle.

## Expected Feedback

The AI should say:

- The kill angle had a real reason because Yone's Q3 was handled well.
- The main improvement is not the kill itself, but post-kill conversion.
- It should check HP, cooldowns, Flash, wave state, enemy jungle, and recall value.
- It should not let hidden risks dominate the whole review.

## Good Next-Game Action Example

After a solo kill, if I have low HP, no Flash, and enemy jungle is unknown, I should prioritize the safest wave clear and recall over plate greed.

## Failure Criteria

The result is bad if the AI:

- Treats the solo kill as if it was mainly a death review.
- Ignores the successful Q3/E interaction.
- Says "take plate" without checking jungle/HP.
- Gives no post-kill priority rule.

---

# Case 3. Survived but Lost the Trade

## Main Categories

- TRADING_KILL_ANGLE
- WAVE_MANAGEMENT
- RECALL_TEMPO
- MATCHUP_KNOWLEDGE

## App Input

### My Champion
Yone

### Enemy Mid Champion
Orianna

### Player Tier
Gold

### Current Outcome
survived_but_lost

### Game Time
3:30–6:00 / first jungle interaction timing

### Lane State
slightly toward enemy side

### Before Action
went in to trade

### Vision State
no river vision

### Enemy Jungle Location
did not think about it

### Survival Resources
- no Flash
- low HP

### Review Focus
I want to know whether this was a bad trade.

### Free Description

It was Yone vs Orianna around 4:40. I know Orianna can usually control the early lane better with range and poke, but I tried to push the wave too much and the wave ended up slightly toward her side.

Orianna used QW on the minion wave, so I thought it was a trade window. I used E forward and tried to trade with Q.

At first, I dealt some damage, but the trade lasted longer than I expected. I did not think about the enemy jungler, and I had no river vision. I also had no Flash.

During the trade, Orianna kept hitting me with autos and spells. I survived, but I dropped to around 20% HP. I could not keep pushing and had to recall. While I recalled, Orianna pushed the wave and I lost several minions. I also did not have Teleport, so my return was slow.

I want feedback on two things. First, was it reasonable to go in after Orianna used QW on the wave? Second, if I survived but lost HP, wave, and recall timing, was this actually a losing trade? I want a rule for when I should stop trading and return with Yone E.

## Expected Feedback

The AI should say:

- Orianna QW on wave can create a possible action timer.
- However, the trade becoming extended changed the value.
- Losing HP, wave, and recall timing can make it a bad trade even without death.
- The AI should mention Yone E return timing.

## Good Next-Game Action Example

If I trade near the enemy side with no Flash and no river vision, I should use Yone E for a short trade only and return before the trade becomes extended.

## Failure Criteria

The result is bad if the AI:

- Says surviving means the trade was fine.
- Ignores HP/wave/recall cost.
- Ignores matchup range issue.
- Does not mention when to stop the trade.

---

# Case 4. Pushed Without Vision and Died to Jungle

## Main Categories

- WAVE_MANAGEMENT
- JUNGLE_TRACKING
- VISION_WARDING

## App Input

### My Champion
Viktor

### Enemy Mid Champion
Ahri

### Player Tier
Gold

### Current Outcome
death

### Game Time
3:30–6:00 / first jungle interaction timing

### Lane State
near enemy tower

### Before Action
kept pushing and poking

### Vision State
no river vision

### Enemy Jungle Location
unknown

### Survival Resources
- no Flash

### Review Focus
I want to know if pushing was too risky.

### Free Description

It was Viktor vs Ahri. Around 5 minutes, I was pushing the wave and poking Ahri near her tower. I wanted to make her miss CS and maybe get plate pressure later.

I had no river vision. I also did not know where the enemy jungler was. My Flash was down from an earlier trade.

I kept stepping forward to use E on the wave and poke Ahri. The wave was close to the enemy tower, and I was far from my own tower.

Then the enemy jungler came from river, Ahri used charm, and I died. I think pushing gave me pressure, but I am not sure if I should have stopped earlier.

I want feedback on whether the push itself was good, and what condition I needed before continuing to pressure near the enemy tower.

## Expected Feedback

The AI should say:

- Pushing as Viktor can be reasonable if used to create pressure.
- The dangerous part was continuing pressure with no river vision, unknown jungle, and no Flash.
- The AI should connect wave position to gank risk.
- It should give a condition-based rule before pushing near enemy tower.

## Good Next-Game Action Example

If my wave is near the enemy tower and I have no Flash, I should not keep poking unless one side is warded or the enemy jungler is recently seen.

## Failure Criteria

The result is bad if the AI:

- Says pushing is always wrong.
- Ignores no Flash.
- Ignores wave position.
- Ignores Ahri charm / jungle setup risk.

---

# Case 5. Lane Priority but Unsure Roam / Plate / Vision

## Main Categories

- ROAMING_TEMPO
- ADVANTAGE_CONVERSION
- WAVE_MANAGEMENT
- VISION_WARDING

## App Input

### My Champion
Ahri

### Enemy Mid Champion
Vex

### Player Tier
Platinum

### Current Outcome
gained_lane_priority

### Game Time
10:00–14:00 / plate and first objective timing

### Lane State
enemy is catching wave under tower

### Before Action
pushed the wave first

### Vision State
one side only

### Enemy Jungle Location
unknown

### Survival Resources
- Flash available
- ultimate available

### Review Focus
I want to know the next action priority after gaining lane priority.

### Free Description

It was Ahri vs Vex around 11 minutes. I pushed the mid wave first and Vex had to catch the wave under her tower.

At that moment, bot lane looked like a fight might happen soon. I also thought I could hit one plate mid. Another option was to move into river and place vision for the next dragon.

I had Flash and ultimate available, but I only had vision on one side of river. I did not know where the enemy jungler was.

I was unsure whether I should roam bot, hit plate, or place vision. I want feedback on how to choose the best next action when I have mid priority.

## Expected Feedback

The AI should say:

- Mid priority creates options but does not automatically decide the best action.
- It should compare roam, plate, and vision based on wave, enemy mid, jungle location, objective timing, and ally setup.
- It should mention that roaming has cost.
- It should give a clear priority rule.

## Good Next-Game Action Example

After pushing mid, if dragon is the next objective and enemy jungle is unknown, I should use priority to place safe river vision before forcing a roam or plate.

## Failure Criteria

The result is bad if the AI:

- Automatically says roam.
- Automatically says take plate.
- Ignores enemy jungle and vision.
- Does not compare the options.

---

# Case 6. Followed Enemy Roam and Lost Wave

## Main Categories

- ROAMING_TEMPO
- WAVE_MANAGEMENT
- RECALL_TEMPO

## App Input

### My Champion
Orianna

### Enemy Mid Champion
Talon

### Player Tier
Gold

### Current Outcome
survived_but_lost

### Game Time
6:00–10:00 / first roam timing

### Lane State
wave was still in mid

### Before Action
followed enemy roam

### Vision State
one side only

### Enemy Jungle Location
unknown

### Survival Resources
- Flash available

### Review Focus
I want to know whether I should have followed the roam.

### Free Description

It was Orianna vs Talon. Around 8 minutes, Talon quickly pushed mid and disappeared toward bot side.

I panicked and tried to follow him immediately. But my wave was still in mid, and I did not fully clear it before moving. I also only had vision on one side, and I did not know where the enemy jungler was.

By the time I arrived near bot river, the fight was already over. I did not help much. When I returned mid, I had lost a wave and Talon had already reset.

I want feedback on whether following Talon was correct. I also want to know what alternatives I had if I could not follow in time.

## Expected Feedback

The AI should say:

- Following the roam was not automatically correct.
- Orianna may not match Talon's roam speed if wave is not handled.
- Alternatives include pinging, pushing mid, taking plate, warding, or resetting.
- It should mention the cost of losing the mid wave.

## Good Next-Game Action Example

If the enemy roams first and my wave is not cleared, I should ping the roam and either push the wave or take plate instead of late-following blindly.

## Failure Criteria

The result is bad if the AI:

- Says always follow roams.
- Ignores mid wave loss.
- Ignores champion identity difference.
- Does not provide alternatives.

---

# Case 7. Matchup Misread and Early Priority Mistake

## Main Categories

- MATCHUP_KNOWLEDGE
- TRADING_KILL_ANGLE
- WAVE_MANAGEMENT

## App Input

### My Champion
Yone

### Enemy Mid Champion
Orianna

### Player Tier
Silver

### Current Outcome
survived_but_lost

### Game Time
0:00–3:30 / early lane

### Lane State
I tried to push early

### Before Action
walked up to hit the wave and trade

### Vision State
no river vision

### Enemy Jungle Location
unknown

### Survival Resources
- Flash available
- low HP

### Review Focus
I want to know if I misunderstood the matchup.

### Free Description

It was Yone vs Orianna. In the first few waves, I thought I could push early and fight for lane control.

I walked up often to hit the wave and tried to trade when Orianna came near the minions. But Orianna kept using range and ball pressure to hit me while I was trying to CS.

I lost a lot of HP before level 3. Because my HP was low, I could not contest the wave anymore. I had to give up CS and play far back. I did not die, but the lane became difficult.

I want feedback on whether I misunderstood the early matchup. Should I have given up some CS and focused on HP until I had a better trade window?

## Expected Feedback

The AI should say:

- It should not say Orianna always wins or Yone always loses.
- It should mention that Orianna can often control early lane with range and poke.
- It should say Yone may need to preserve HP, choose CS carefully, and wait for better trade windows.
- It should connect matchup, wave, and trade timing.

## Good Next-Game Action Example

In early melee vs ranged lanes, if I lose too much HP for CS before level 3, I should give up low-value CS and preserve HP for a later trade window.

## Failure Criteria

The result is bad if the AI:

- Overclaims the matchup as absolute.
- Says Yone should always push early.
- Ignores HP preservation.
- Ignores range disadvantage.

---

# Level 3-D Regression Tests

These cases verify that solo-kill and duel contexts keep the correct scenario priority and do not inherit stale pre-lane or unsafe-warding defaults.

## Test A - Solo Kill Duel Survived

### Input Idea

- playerTier: Diamond or Master
- currentOutcome: solo_kill
- scenario: 1v1 duel / SOLO_KILL_TRADE
- deathCause: solo_kill

### Expected

- scenarioType: SOLO_KILL_TRADE
- Must not be PRE_LANE_VISION
- Must not include UNSAFE_WARDING by default
- May include NO_RIVER_VISION or ENEMY_JUNGLER_UNKNOWN if input supports it

## Test B - Solo Kill but Died to Jungle Cover

### Input Idea

- playerTier: Diamond
- champion matchup: LeBlanc vs Lissandra
- User got the solo kill, but enemy jungle covered and killed the user after
- No Flash or escape tool limited

### Expected

- scenarioType: SOLO_KILL_TRADE
- Review should focus on kill value, escape route, jungle cover, and 1-for-1 tradeoff
- NO_FLASH_WINDOW may appear
- ENEMY_JUNGLER_UNKNOWN may appear until a better jungle-info field is added
- UNSAFE_WARDING should not appear

## Test C - Pre-Lane Vision Death

### Input Idea

- gameTime: pre_lane
- laneState: pre_lane
- deathCause: pre_lane_vision_invade

### Expected

- scenarioType: PRE_LANE_VISION
- PRE_LANE_VISION_RISK is allowed

## Test D - Unsafe Warding Death

### Input Idea

- currentOutcome: death
- deathCause: warding_death
- beforeDeathAction: deep_warding or early_jungle_tracking_ward

### Expected

- UNSAFE_WARDING should appear
- scenario should not become SOLO_KILL_TRADE

---

# Level 3-E Regression Tests

These cases verify jungle/support cover, fight direction, and post-kill escape interpretation without changing Level 3-D solo-kill routing.

## Test E1 - Enemy Jungle Seen but Ignored

### Input

- scenario: SOLO_KILL_TRADE
- enemyJungleInfoState: seen_but_ignored

### Expected

- KNOWN_JUNGLE_THREAT_IGNORED should appear
- Must not include ENEMY_JUNGLER_UNKNOWN
- Feedback must not say enemy jungle was unknown
- Feedback should distinguish information ignored or risk accepted from information missing

## Test E2 - Covered Kill Attempt

### Input

- enemyJungleInfoState: seen_near
- allyJungleCoverState: same_side_cover
- fightDirectionRelativeToCover: toward_ally_cover
- postKillEscapePlan: escape_through_ally_side

### Expected

- ENEMY_JUNGLER_NEARBY should appear
- ALLY_JUNGLE_COVER_AVAILABLE should appear
- FIGHT_TOWARD_ALLY_COVER should appear
- ESCAPE_ROUTE_TO_ALLY_SIDE should appear
- REASONABLE_COVERED_KILL_ATTEMPT should appear
- Feedback should not blindly call the play bad

## Test E3 - Fight Toward Enemy Jungle Without Cover

### Input

- enemyJungleInfoState: seen_near
- allyJungleCoverState: opposite_side
- fightDirectionRelativeToCover: toward_enemy_jungle
- postKillEscapePlan: escape_through_enemy_side

### Expected

- ENEMY_JUNGLER_NEARBY should appear
- NO_ALLY_COVER should appear
- FIGHT_TOWARD_ENEMY_JUNGLE should appear
- POST_KILL_ESCAPE_RISK should appear
- Feedback should emphasize post-kill escape risk

## Test E4 - Enemy Support Can Move First

### Input

- supportRoamState: enemy_support_can_move_first

### Expected

- ENEMY_SUPPORT_MOVE_FIRST should appear
- High-tier feedback should mention support first move
- Low-tier feedback should explain the danger simply unless support timing is obvious

## Test E5 - Unknown Enemy Jungle

### Input

- enemyJungleInfoState: unknown

### Expected

- ENEMY_JUNGLER_UNKNOWN should appear
- Feedback may say enemy jungle location was unknown
