# Mid Laning Death Review AI

AI coaching web app for reviewing League of Legends mid lane laning phase deaths.

This project helps players review death situations during the laning phase by generating possible risk tags, review questions, and next-game action goals.

The goal of this app is not to give one fixed answer. Instead, it helps players think more clearly about why a death happened and what they can try in the next game.

## Current Status

Level 2-A MVP completed.

The app currently supports manual death situation input, risk tag generation, Gemini API review generation, and Korean feedback output.

## Main Features

- Death situation input form
- Player tier selection
- Current outcome selection
- Game time phase selection
- Pre-lane vision and invade situation options
- Risk tag generation
- Gemini API review generation
- Korean AI coaching feedback
- Review result card UI

## Example Risk Tags

- `PRE_LANE_VISION_RISK`
- `UNSAFE_WARDING`
- `NO_RIVER_VISION`
- `ENEMY_JUNGLER_UNKNOWN`
- `UNTRACKED_PUSH`
- `CS_GREED`
- `NO_FLASH_WINDOW`
- `NO_ESCAPE_TOOL`

## Design Philosophy

This app avoids saying, “This was definitely the reason you died.”

League of Legends situations are complex, and one death can come from many possible factors.  
Because of that, this app focuses on giving possible risk factors and reflection questions instead of forcing a single answer.

The goal is to help the player review their own decision-making.

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Gemini API

## Project Structure

```text
app/
  api/review/route.ts      # Gemini API review route
  page.tsx                 # Main page

components/
  DeathReviewForm.tsx      # Input form
  ReviewResultCard.tsx     # Review result UI

lib/
  prompts.ts               # AI prompt design
  riskTagMapper.ts         # Rule-based risk tag generation

types/
  review.ts                # TypeScript types