# Level 3-E — Jungle / Support Cover & Fight Direction

## Purpose

Level 3-E helps the app distinguish whether a mid-lane duel or solo-kill attempt was risky because of jungle/support cover and post-kill escape direction.

## Core Distinctions

### Enemy jungle unknown

This is an information problem.

The review may say the player did not know enemy jungle location.

Main coaching focus: basic jungle tracking, river vision, and avoiding extended fights without information.

### Enemy jungle seen but ignored

This is not an information problem.

The review must not say the player did not know enemy jungle location.

This is an information-disrespect or risk-acceptance problem.

Main coaching focus: whether the kill expected value justified accepting known jungle cover risk.

### Enemy jungle nearby

The kill angle can still be mechanically correct.

The key question is whether the player can finish the fight quickly and escape.

If allied cover is unavailable and the fight goes toward enemy jungle, post-kill expected value is low.

### Enemy jungle seen far

Do not over-punish the play by default.

Evaluate whether enemy jungle could realistically arrive before or after the kill.

## Ally Jungle Cover Logic

### Ally jungle same side or near mid

The play may be reasonable if the player fights toward ally cover and has a post-kill escape route.

Do not blindly call the play bad.

Ask whether the player intentionally used ally jungle cover.

### Ally jungle opposite side or too far

The player should not assume countergank or backup.

If the fight direction is toward enemy jungle, emphasize post-kill escape risk.

## Fight Direction Logic

### Fighting toward ally cover

Usually safer than fighting toward enemy jungle.

It can make a risky solo kill attempt more reasonable.

Still check fight duration, enemy jungle arrival time, and escape route.

### Fighting toward enemy jungle

Kill angle can exist mechanically.

Expected value drops if the player cannot escape after the kill.

Especially risky with no flash, low HP, no mobility, or enemy support first move.

## Support Roam Logic

### Enemy support missing or can move first

Low tier: explain simply that an unseen support can punish extended fights.

Emerald/Diamond: mention support first move and mid-jungle-support cover timing.

Master+: connect support first move to tempo, wave loss, river control, objective setup, and opportunity cost.

### Ally support can move

The play may be more reasonable if ally support can realistically cover first.

Do not overstate this if the input only says ally support can move but does not mention lane priority or timing.

## Tier-Specific Coaching Depth

### Iron / Bronze / Silver

Focus on survival.

Ask: Did you know where enemy jungle was?

Ask: Did you have flash or mobility?

Ask: Could you leave after the kill?

Avoid advanced terms like tempo, opportunity cost, support first move, or countergank window unless the input makes it obvious.

### Gold / Platinum

Focus on enemy jungle tracking, ally jungle side, wave state, and escape planning.

Ask whether ally jungle was same side or opposite side.

Ask whether the wave made the fight safer or riskier.

### Emerald / Diamond

Focus on fight direction, ally cover, enemy cover, support roam timing, and 1-for-1 tradeoff.

Ask whether the player fought toward ally cover or toward enemy jungle.

Ask whether the kill was still good if the player died after the kill.

### Master+

Focus on expected value, tempo, wave crash, recall timing, cover direction, opportunity cost, and the next 30-90 seconds.

Ask whether the kill created a real tempo advantage or only forced a low-value 1-for-1.

Ask whether dying after the kill lost wave, reset timing, river control, or objective setup.

Do not give only low-tier advice like "play safe and farm."

## Required Prompt Behavior

If enemyJungleInfoState is seen_far, seen_near, or seen_but_ignored:

Do not say enemy jungle location was unknown.

Prefer:

"상대 정글 정보를 알고도 리스크를 감수한 판단일 수 있습니다."

"정보 부족 문제가 아니라 정보 해석/리스크 수용 문제일 수 있습니다."

If REASONABLE_COVERED_KILL_ATTEMPT is present:

Do not blindly criticize the play.

Explain that the play may be reasonable if ally cover, fight direction, and escape route supported it.

If Master+ and any of these are present:

- ENEMY_SUPPORT_MOVE_FIRST
- FIGHT_TOWARD_ENEMY_JUNGLE
- POST_KILL_ESCAPE_RISK
- NO_ALLY_COVER

Then mention:

- 1-for-1 expected value
- wave loss or recall timing if relevant
- next 30-60 seconds of mid tempo
- river vision or objective setup cost if relevant
- opportunity cost

## Test Notes

Reference `docs/test-cases.md` Level 3-E tests E1-E5.
