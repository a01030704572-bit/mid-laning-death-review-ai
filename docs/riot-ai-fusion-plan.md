# Riot + AI Fusion Plan

## Goal

Future review quality should come from combining three evidence layers instead of asking one AI model to guess everything from a short clip.

## Layer Responsibilities

### Gemini / OpenAI: visual scene reading

- Read the uploaded clip or extracted frames.
- Identify visible lane state, movement, fight outcome, warding action, and unclear visual facts.
- Treat the player's note as a self-review hypothesis, not ground truth.
- Return normalized draft inputs for the existing review form.

### Riot API: match and timeline factual evidence

- Provide objective timestamps, kill/death events, summoner spell timing, item/gold state, ward events, lane CS, XP, and map-side timeline context.
- Confirm whether dragon, grubs, Herald, plates, deaths, and recalls actually happened.
- Resolve facts that are hard to prove from frames alone.

No Riot API calls are implemented in this level.

### Coaching engine: decision risk and validity explanation

- Compare visual facts, player hypothesis, Riot timeline facts, and uncertain facts.
- Explain why the decision was risky.
- Explain when the decision could be valid.
- Explain what the player should check next time.
- Explain likely gain/loss structure when relevant.
- Avoid simply agreeing with the player or saying "you were wrong."

## Intended Data Flow

1. User uploads clip and writes an optional scene note.
2. Gemini native video or OpenAI frame vision extracts a visual draft.
3. Future Riot API lookup fetches match/timeline facts for the same scene window.
4. A fusion step compares:
   - visibleFacts
   - playerHypothesis
   - riotFacts
   - coachingHypotheses
   - uncertainFacts
   - riskReasoning
   - likelyGainLossStructure
5. The existing coaching engine produces the final decision review.

## Non-goals For Current Level

- Do not call Riot API.
- Do not require Riot account linking.
- Do not replace the existing manual review form.
- Do not treat AI visual output as definitive factual evidence.
