# Story Royale — Hackathon MVP

Read the story. Enter the world. Help Mowgli send a message to Baloo.

## What this is

A Phaser 3 + Next.js 15 demo of the Story Royale concept:
- Title screen → 4-page narrated storybook → drag-and-drop arena
- Mowgli (NPC) responds in character via Claude Haiku, grounded in the story bible
- Voice synthesis via ElevenLabs Flash (optional)
- Hardcoded fallback responses so the demo never breaks if APIs fail

## Run it

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local with your real API keys (or leave blank to use fallbacks)
npm run dev
```

Open `http://localhost:3000`. Works without any API keys (uses placeholder
art and hardcoded Mowgli responses). Add keys to make it sing.

## API keys you need

- `ANTHROPIC_API_KEY` — required for dynamic Mowgli dialogue. Get from https://console.anthropic.com
- `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` — optional. Voice synthesis. Pick a warm, child-friendly voice in their library.

## File map

- `app/page.tsx` — mounts Phaser
- `app/PhaserGame.tsx` — Phaser game config and scene wiring
- `app/api/protagonist/route.ts` — Mowgli's brain (Claude Haiku + fallbacks). **THIS IS THE IP.**
- `app/api/voice/route.ts` — ElevenLabs voice synthesis
- `src/data/storyBible.ts` — The Jungle Book Chapter 3 rules and objects
- `src/scenes/TitleScene.ts` — entry screen
- `src/scenes/StorybookScene.ts` — 4-page narrated storybook
- `src/scenes/ArenaScene.ts` — the playable arena

## Hour-by-hour plan for hackathon day

### Tonight (5 hrs)

- **6–7pm:** Write/test the protagonist prompt. Open `app/api/protagonist/route.ts`, set up `.env.local`, run `npm install` and `npm run dev`, drop each object on Mowgli, listen to responses. Iterate the prompt in `buildSystemPrompt()` until Mowgli sounds right.
- **7–9pm:** Generate Ideogram assets in your Artory style. Drop into `public/assets/images/`:
  - `cold-lairs-bg.png` (1280×720, the arena background)
  - `mowgli.png` (transparent PNG, ~200×200)
  - `chil.png`, `masterword.png`, `parrot.png`, `stone.png`, `vine.png` (~150×150 each)
  - `page1.png` through `page4.png` (storybook illustrations)
- **9–10pm:** Generate ElevenLabs narration MP3s for the 4 storybook pages. Drop into `public/assets/audio/` as `narration1.mp3` through `narration4.mp3`. Also grab CC0 sound effects from freesound.org for `pickup.mp3`, `drop.mp3`, `success.mp3`, `hmm.mp3`.
- **10–11pm:** Sleep. Don't push past midnight.

### Tomorrow

- **8am–noon:** Polish. Drop in your real assets, tweak Mowgli's prompt based on how he sounds with real audio, adjust object positions in `placeObjects()` for the new sprites.
- **12–2pm:** Test end-to-end on a fresh device with hackathon wifi. Hit every object. Verify fallbacks work (kill the API key temporarily — should still play).
- **2–5pm:** Animation polish, sound polish, win-screen feel. Practice the 60-second pitch.
- **5–7pm:** Final run-throughs. Demo.

## What to cut if you're behind

Cut ruthlessly in this order:
1. ElevenLabs voice → fall back to text only
2. Storybook narration MP3s → text-only pages
3. Custom Ideogram art → run with placeholder colored circles (the code already handles this gracefully)
4. Sound effects → silent mode

The demo still works at every level of cuts. The IP is the protagonist's response, not the polish.

## What NOT to cut

- The protagonist API route. This is the demo.
- The drag-and-drop. This is the interaction.
- The storybook → arena transition. This is the narrative arc.

## Pitch slide order (after demo)

1. **The mechanic** — "The story IS the game. Reading is the competitive advantage."
2. **Why it's hard** — Show the story bible JSON. "We extract this from any text. The protagonist is grounded in it. No hallucinations."
3. **What's next** — Multiplayer, Creator mode where kids write stories, Marble integration for 3D worlds.

## Backup plan

If Phaser breaks at the venue:
- The fallback responses in `app/api/protagonist/route.ts` work standalone — you can demo "the brain" via curl/Postman
- Prepare a 60-second screen recording of the working demo on your phone before you leave for the venue

Never present without a screen recording in your back pocket.
