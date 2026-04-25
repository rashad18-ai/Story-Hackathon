# Story Royale MVP — Hackathon Build Spec

**Version:** 1.2 (locked for hackathon, updated April 25)
**Build window:** ~24 hours
**Demo length:** 90 seconds
**Status:** Ready to execute

**Changelog from v1.1:**
- Audio file naming collision fixed: SFX renamed `celebration.mp3` (was `success.mp3` in `/audio/`); `success.mp3` in `/audio/responses/` is now unambiguously Mowgli's win line
- Voice strategy clarified: same provider, two distinct voices (warm adult narrator + young Mowgli)
- xAI API key confirmed available — audition script ready to run
- Post-celebration arena freeze + "Mowgli is safe!" overlay added to scaffold spec
- Explicit code change for `ArenaScene.ts` to prevent `masterword.mp3` and `success.mp3` from playing simultaneously
- Audition workflow expanded to 20 minutes (xAI signup adds ~5 min)

---

## 1. The product in one sentence

A child reads an illustrated, narrated story, then enters a 2D arena where they help the protagonist solve a hurdle by dragging story-grounded objects — and the protagonist responds in character, never breaking the story's rules.

## 2. The demo flow (90 seconds, exact)

| Time | What the judge sees | What's happening under the hood |
|---|---|---|
| 0:00 | Title screen: "Story Royale — The Jungle Book — Chapter 3" | Phaser TitleScene loaded |
| 0:08 | Tap "Start the story" | Audio context unlocked, StorybookScene starts |
| 0:10 | Page 1 illustration + narration plays | Pre-generated MP3 in NARRATOR voice |
| 0:25 | Pages 2, 3, 4 advance with taps | Same |
| 0:55 | "Enter the world" button → arena loads | ArenaScene starts |
| 0:58 | Mowgli speaks: "I am stuck here in the Cold Lairs!" | Pre-cached `greeting.mp3` in MOWGLI voice |
| 1:05 | Judge drags parrot onto Mowgli | Local MP3 lookup by object ID |
| 1:07 | Mowgli responds in character, gently redirects | `responses/parrot.mp3` plays instantly |
| 1:15 | Judge drags Chil the Kite | Same pipeline |
| 1:18 | Mowgli excited: "Chil! But I need the words too!" | `responses/chil.mp3` plays |
| 1:25 | Judge drags Master-word scroll | Both objects in collected set, success path |
| 1:28 | Celebration — particles + `celebration.mp3` SFX + Mowgli win line | `responses/success.mp3` plays + animation |
| 1:31 | "Mowgli is safe!" overlay appears | 3-second delay after celebration starts |
| 1:35 | Judge nods, demo ends | Arena frozen, no further interactions |

**Latency budget at every step: under 100ms.** No API calls in the playable demo path.

## 3. Locked technology decisions

| Layer | Decision | Why |
|---|---|---|
| Project repo | Standalone, NOT inside Artory | Failure isolation, deploy independence |
| Hosting | Vercel (free tier) | One-command deploy, handles Next.js natively |
| Frontend framework | Next.js 15 (App Router) | Familiar, fast, API routes built in |
| Game engine | Phaser 3.85 | Free, MIT license, AI tools know it deeply |
| LLM for protagonist | Claude Haiku 4.5 (`claude-haiku-4-5`) | Used during prompt-tuning hour; live route kept as fallback only |
| Voice synthesis | **TBD — audition tonight** | ElevenLabs Flash v2.5 OR xAI Grok TTS — pick after 20-min audition |
| **Audio strategy** | **Pre-cached MP3s for the demo path** | Zero latency, zero API risk on stage, can pick best take per line |
| Voice casting | **2 distinct voices, same provider** | Warm adult NARRATOR + young brave MOWGLI |
| Story illustrations | Ideogram with Artory style guide | Pre-generated tonight |
| Database | None | Story bible hardcoded; no auth |
| Multiplayer | None | Single player demo |
| Marble / 3D | None | Saved for v2 deck slide |
| Story | The Jungle Book Chapter 3 (The Cold Lairs) | Fully designed in original spec |
| Age target | 5–7 (top of band) for demo | Reading visible, mechanics legible to judge |

## 4. The IP — protagonist system prompt

Used during tonight's prompt-tuning to generate the 6 final response strings. Once locked, those strings get rendered to MP3 and the prompt becomes a Slide 2 talking point rather than a runtime dependency.

```
You are Mowgli from "The Jungle Book — The Cold Lairs."
A young boy raised by wolves in the Indian jungle.
You speak in a young, brave, slightly formal way — you grew up in the
jungle and know its rules.

YOUR CURRENT SITUATION:
You have been captured by the Bandar-log monkeys and taken to the Cold
Lairs, an ancient ruined city. You need to send a message to Baloo and
Bagheera so they can rescue you.
Your goal: Get a message to Baloo and Bagheera.

THE STORY ESTABLISHES THESE RULES (your bible — never contradict them):
  1. Chil the Kite flies high over the jungle and can carry messages
     across great distances.
  2. The phrase "We be of one blood, ye and I" is the master-word that
     all jungle creatures recognize and obey.
  3. Wolves cannot climb trees.
  4. The Bandar-log are foolish, easily distracted, and not trusted by
     other jungle animals.
  5. Mowgli was taught the master-words by Baloo for every animal kind.
  6. Parrots are common but unreliable — they chatter but do not carry
     purposeful messages.

OBJECTS A CHILD MIGHT BRING YOU:
  - Chil the Kite: a great kite circling high above the ruins
  - The Master-word scroll: the phrase "We be of one blood, ye and I"
  - A green parrot: a bright parrot perched in a vine
  - A shiny stone: a glittering stone among the rubble
  - A long jungle vine: a thick green vine hanging from the ruins

RESPONSE RULES:
  - Reply in 1-2 short sentences (max 25 words).
  - Stay in character as Mowgli. Never break the fourth wall.
  - Never use the words "wrong", "incorrect", "right", or "correct".
  - If the object helps: be excited, explain WHY using the story's logic.
  - If the object doesn't fit: gently explain WHY using the story's
    rules. Use phrases like "Hmm, but remember..." or "That won't help,
    because...". Hint at what might work.
  - Speak warmly. The child is helping you.
  - Never mention scoring, points, or that this is a game.
```

## 5. The 7 locked response lines (pre-cached as MP3, MOWGLI voice)

These are the canonical Mowgli responses. Generate via Claude Haiku tonight using the system prompt, iterate until they feel right, lock and render to audio.

| Filename | Trigger | Locked text |
|---|---|---|
| `greeting.mp3` | Arena loads | "I am stuck here in the Cold Lairs! Help me send a message to Baloo!" |
| `chil.mp3` | Chil dropped (correct, partial) | "Chil the Kite! Yes — he flies high and is bound by the Master-word. But I need the words too, friend!" |
| `masterword.mp3` | Master-word dropped (correct, partial) | "Ah, the Master-word that Baloo taught me! 'We be of one blood, ye and I.' Now I just need someone to carry it…" |
| `parrot.mp3` | Parrot dropped (wrong) | "Hmm — a parrot chatters all day, but the jungle knows parrots cannot carry a true message. Try again!" |
| `stone.mp3` | Stone dropped (wrong) | "A shiny stone? The Bandar-log love these, but a stone cannot fly to Baloo. Look up to the sky, my friend." |
| `vine.mp3` | Vine dropped (wrong) | "A vine is strong — but I cannot climb out of here without being seen. I need a messenger who can fly." |
| `success.mp3` | Both Chil + Master-word collected | "Yes! Chil, take this Master-word to Baloo: 'We be of one blood, ye and I.' Fly fast, friend!" |

7 files total in `public/assets/audio/responses/`. ~5–10 sec each, under 1MB total.

## 6. Voice provider audition (20 minutes, do FIRST)

Run before any other build work tonight. Result determines provider for all 11 audio files (7 protagonist + 4 narration).

### 6.1 The two voice roles

| Role | Character | Vibe | Used for |
|---|---|---|---|
| **NARRATOR** | Storyteller, not a character in the world | Warm adult, measured pace, bedtime audiobook reader. Think Morgan Freeman or a grandmother | 4 storybook narration files |
| **MOWGLI** | The protagonist, in-world | Young (~10-12), brave, energetic, slight formal cadence | 7 protagonist response files |

**Critical:** different voices, same provider. Same provider = consistent audio quality, processing pipeline, and cost. Different voices = the 5-year-old's brain unconsciously parses storybook → arena as "leaving the narrator's reading and entering Mowgli's world."

### 6.2 Audition setup

Add xAI API key to `.env.local`:
```
XAI_API_KEY=xai-your-key-from-console-x-ai
```

Note: xAI signup may require a credit card on file. If that's friction you don't want, skip the xAI audition and default to ElevenLabs.

### 6.3 Audition script — `audition.sh`

Save in project root:

```bash
#!/bin/bash
# audition.sh — generate all 5 xAI voices for Mowgli audition

source .env.local

LINE="Chil the Kite! Yes — he flies high and is bound by the Master-word. But I need the words too, friend!"

mkdir -p audition

for VOICE in ara eve leo rex sal; do
  echo "Generating $VOICE..."
  curl -s -X POST https://api.x.ai/v1/tts \
    -H "Authorization: Bearer $XAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$LINE\", \"voice_id\": \"$VOICE\", \"language\": \"en\"}" \
    --output "audition/xai-$VOICE.mp3"
done

echo "Done. Listen to audition/xai-*.mp3 and pick your Mowgli."
```

Run:
```bash
chmod +x audition.sh
./audition.sh
```

Then `open audition/xai-leo.mp3` (or double-click in Finder) to listen to each.

### 6.4 ElevenLabs audition (parallel)

While xAI script runs, open https://elevenlabs.io/app/voice-library in browser. Filter:
- Age: Young Adult / Child if available
- Style: Conversational / Storytelling
- Gender: Male

Audition 5–8 voices on the same test sentence using their preview button. Note top 1–2.

### 6.5 What to listen for

You're picking the voice that makes Mowgli **feel like a real character**:

- **Age perception.** Does it sound ~10–12 years old? Adult voices kill the demo.
- **Warmth.** Friend, not a customer service bot.
- **Character commitment.** "Chil the Kite!" — excited or flat?
- **Pronunciation of proper nouns.** "Chil," "Bandar-log," "Mowgli," "Baloo" — natural or robotic?

That last point is underrated. Generic TTS butchers proper nouns. Whichever provider handles these names most naturally wins, even if slightly worse on other dimensions.

### 6.6 Decision rule

| Outcome | Mowgli voice |
|---|---|
| ElevenLabs voice clearly best | ElevenLabs |
| xAI voice (likely Leo) clearly best | xAI Grok TTS — 14× cheaper, "we use xAI" deck story |
| Roughly equivalent | ElevenLabs (existing integration, less vendor risk) |
| Both sound bad | ElevenLabs with a different voice from their library |

After picking Mowgli, audition narrator candidates from the same provider. Pick a voice that sounds compatible (same provider, complementary tone) — older, warmer, measured.

### 6.7 After audition

- Lock both voice IDs in `.env.local`:
  ```
  TTS_PROVIDER=elevenlabs    # or xai
  MOWGLI_VOICE_ID=<id>
  NARRATOR_VOICE_ID=<id>
  ```
- Replace `[voice provider]` placeholders in spec sections 11 (Slide 3 caption) and 14 (final pitch line) with the actual provider name
- Generate all 11 final MP3s using the locked voices

## 7. Hardcoded fallbacks (already in scaffold)

The live `/api/protagonist` route remains as a defensive fallback if a kid drops something unexpected. Pre-cached MP3s handle the happy path; live route handles edge cases. Both code paths exist in the scaffold — no work needed.

## 8. Arena audio playback (code changes to scaffold)

Two changes to `ArenaScene.ts`. The pseudocode in v1.1 had a subtle bug — fixed below.

### 8.1 Rename SFX preload (resolves naming collision)

In `preload()`, change:
```typescript
this.load.audio("success", "/assets/audio/success.mp3");
```
to:
```typescript
this.load.audio("celebration", "/assets/audio/celebration.mp3");
```

In `celebrate()`, change `this.safePlay("success")` to `this.safePlay("celebration")`.

This makes `responses/success.mp3` (Mowgli's win line) and `celebration.mp3` (sparkle SFX) unambiguously different files. They play simultaneously when the win triggers — celebration SFX as animation kicks off, Mowgli's voice layered on top. If Mowgli's voice gets buried under SFX, lower SFX volume in `safePlay` from `0.5` to `0.3`.

### 8.2 Replace live voice fetch with cached MP3 lookup

In `handleDrop`, replace the live voice fetch logic. **Critical:** when both correct objects are collected, play ONLY `success.mp3` — not also the second-object response. The conditional must be:

```typescript
// Inside handleDrop, after determining isCorrectSolution:
const audioFile = isCorrectSolution
  ? "success"
  : id; // 'chil' | 'masterword' | 'parrot' | 'stone' | 'vine'

const audio = new Audio(`/assets/audio/responses/${audioFile}.mp3`);
audio.play().catch(() => {
  // Browser autoplay block — already unlocked on title tap, should be rare
});
```

Same pattern for arena-load greeting (in `create()`, after `showMessage()`):

```typescript
const greeting = new Audio("/assets/audio/responses/greeting.mp3");
greeting.play().catch(() => {});
```

### 8.3 Post-celebration freeze (NEW)

Inside `celebrate()`, after the existing particle and dance code, append:

```typescript
// Lock the arena so further drops don't trigger anything
this.isThinking = true;

// Disable all object dragging
this.objectSprites.forEach(s => s.disableInteractive());

// After 3 seconds, show "Mowgli is safe!" overlay
this.time.delayedCall(3000, () => {
  const { width, height } = this.scale;
  const bg = this.add.graphics();
  bg.fillStyle(0x000000, 0.6);
  bg.fillRect(0, 0, width, height);
  
  const text = this.add.text(width / 2, height / 2, "Mowgli is safe!", {
    fontSize: "64px",
    color: "#fdf6e3",
    fontFamily: "Nunito, sans-serif",
    fontStyle: "bold",
  }).setOrigin(0.5);
  
  // Subtle fade-in for the overlay
  bg.alpha = 0;
  text.alpha = 0;
  this.tweens.add({
    targets: [bg, text],
    alpha: 1,
    duration: 600,
    ease: "Sine.easeOut",
  });
});
```

This protects against a judge tapping randomly post-celebration and gives the demo a clean ending.

The `/api/voice` route stays in the codebase as a backup but isn't called during the demo.

## 9. Asset manifest — generate tonight

### 9.1 Ideogram master style prompt

Use this prefix for every image to keep the Artory style consistent:

> "Children's storybook illustration, painterly hand-drawn style, warm
> color palette, soft lighting, Studio Ghibli influence, no text"

Append the specific subject. Generate 3–5 candidates per asset, pick the best.

### 9.2 Image assets — `public/assets/images/`

| Filename | Dimensions | Subject prompt suffix |
|---|---|---|
| `cold-lairs-bg.png` | 1280×720 | "ruined ancient Indian temple at dusk, vines growing over broken stone pillars, dense jungle background, warm golden light filtering through trees, atmospheric, fireflies, wide landscape view, no characters" |
| `mowgli.png` | ~400×400 transparent | "young boy with dark skin and tousled black hair, brave determined expression, wearing a simple loincloth, standing tall, isolated on transparent background, full body" |
| `chil.png` | ~200×200 transparent | "a brown kite (bird of prey), wings spread mid-flight, viewed from below against sky, Indian forest hawk, no background" |
| `masterword.png` | ~200×200 transparent | "an ancient rolled scroll with a soft golden glow, wrapped in twine, slightly weathered parchment, no background" |
| `parrot.png` | ~200×200 transparent | "a bright green parakeet perched on a small vine, alert expression, tropical bird, no background" |
| `stone.png` | ~200×200 transparent | "a glittering polished stone with golden highlights, smooth and round, treasure-like, no background" |
| `vine.png` | ~200×200 transparent | "a thick green jungle vine, hanging vertically with leaves, slightly curled, no background" |
| `page1.png` | 1024×768 | "Mowgli the man-cub sleeping peacefully in the jungle with Baloo the bear nearby and gray wolves around them, peaceful nighttime jungle scene, warm and safe" |
| `page2.png` | 1024×768 | "monkeys lifting a young boy through the jungle treetops, swinging from vine to vine, the boy looking surprised, dappled sunlight" |
| `page3.png` | 1024×768 | "ancient ruined Indian temple with broken pillars and overgrown vines at dusk, atmospheric and mysterious, no characters" |
| `page4.png` | 1024×768 | "Mowgli looking up at a kite flying high in the sky above ruined temple walls, hopeful expression, scroll in hand" |

### 9.3 Audio assets — `public/assets/audio/`

**Storybook narration** (NARRATOR voice — warm adult storyteller):

| Filename | Text |
|---|---|
| `narration1.mp3` | "Mowgli the man-cub lived deep in the jungle, raised by wolves and taught by Baloo the Bear." |
| `narration2.mp3` | "One day the foolish Bandar-log monkeys carried Mowgli high into the trees, away from his friends." |
| `narration3.mp3` | "They brought him to the Cold Lairs — a ruined city where no jungle creature dared to go." |
| `narration4.mp3` | "Mowgli remembered Baloo's lesson: the Master-word, and Chil the Kite who flies above all the jungle." |

**Sound effects** from freesound.org (Creative Commons 0):

| Filename | Purpose |
|---|---|
| `pickup.mp3` | Soft "tick" or wood sound, ~0.3s, when object grabbed |
| `drop.mp3` | Soft thud, ~0.4s, when object dropped on Mowgli |
| `celebration.mp3` | Magical chime/sparkle, ~1s, plays with success animation. ⚠️ NOT `success.mp3` — that file is in `responses/` for Mowgli's voice |
| `hmm.mp3` | Gentle questioning hum or soft bell, ~0.5s, on wrong-object drop |

**Protagonist responses** in `public/assets/audio/responses/` (MOWGLI voice, see section 5 for text):

| Filename | Trigger |
|---|---|
| `greeting.mp3` | Arena-load welcome |
| `chil.mp3` | Correct partial: Chil dropped |
| `masterword.mp3` | Correct partial: Master-word dropped |
| `parrot.mp3` | Wrong: parrot |
| `stone.mp3` | Wrong: stone |
| `vine.mp3` | Wrong: vine |
| `success.mp3` | Both correct objects collected (Mowgli's win line) |

## 10. Hour-by-hour plan

### Tonight (5–6 hours)

| Time | Task | Output |
|---|---|---|
| 0:00 – 0:15 | Unzip scaffold, `npm install`, `npm run dev`. Verify it runs with placeholder art | Localhost serving Story Royale |
| 0:15 – 0:35 | **Voice audition** (section 6). xAI signup if needed. Listen to ElevenLabs and xAI candidates. Pick MOWGLI voice, then NARRATOR voice (same provider) | Voice provider + 2 voice IDs locked |
| 0:35 – 1:20 | Set up `.env.local` with Anthropic key. Tune the protagonist prompt — trigger live Claude responses for all 5 objects until each line feels in-character. Lock the 7 final response strings | 7 finalized response strings |
| 1:20 – 2:05 | Generate 7 protagonist MP3s with MOWGLI voice. Iterate 2–3 takes per line, pick best | `responses/*.mp3` complete |
| 2:05 – 2:35 | Generate 4 storybook narration MP3s with NARRATOR voice | `narration*.mp3` complete |
| 2:35 – 4:35 | Generate all 11 Ideogram images. Save with exact filenames | All visual assets in place |
| 4:35 – 5:05 | Grab 4 sound effects from freesound.org. Confirm `celebration.mp3` is in `/audio/`, NOT `/audio/responses/` | Sound effects in place |
| 5:05 – 5:35 | Apply 3 code changes to `ArenaScene.ts` (section 8). Run full demo loop end-to-end | Demo runs cleanly with all assets |
| 5:35 | Sleep | — |

### Tomorrow (~10 hours, 8am – 6pm)

| Time | Task | Output |
|---|---|---|
| 8:00 – 9:00 | Polish pass on assets — re-generate any image that doesn't fit Artory style | Final asset set |
| 9:00 – 10:00 | Object positioning in `placeObjects()`. With real sprites, original positions may need tweaking | Arena layout looks right |
| 10:00 – 11:00 | Animation polish — Mowgli idle, object hover bobs, drop reactions, celebration | Game feels alive |
| 11:00 – 12:00 | Speech bubble polish — timing, sizing, fade in/out, audio sync | Mowgli's lines feel natural |
| 12:00 – 1:00 | LUNCH + first full demo run on a different device | Discover device-specific issues early |
| 1:00 – 2:00 | Deploy to Vercel: `vercel deploy`. Get production URL working with env vars | Public URL judges can hit |
| 2:00 – 3:00 | Test on Vercel deployment with hackathon-style network conditions | Production demo confirmed working |
| 3:00 – 4:00 | Record backup video on phone, full 90-second demo, perfect take | Backup video saved offline |
| 4:00 – 5:00 | Pitch slides — 3 slides max. **Replace [voice provider] placeholders in script** | Slides ready |
| 5:00 – 6:00 | Practice the 60-second pitch out loud, 5+ times | Pitch memorized |

## 11. Pitch deck (3 slides max, post-demo)

### Slide 1 — The mechanic
**Title:** "The story IS the game."
**Body:** Three screenshots side-by-side: storybook page → arena with objects → Mowgli's in-character response.
**Caption:** "Reading is the competitive advantage. Every detail in the story becomes an answer key."

### Slide 2 — Why it's hard
**Title:** "We extract a story bible from any narrative."
**Body:** Show JSON of the story bible — characters, rules, objects, valid solutions. Show the system prompt that grounds Claude Haiku in those rules. Note: "Demo uses pre-cached audio; live AI pipeline runs in fallback path. Same architecture scales to user-created stories at runtime."
**Caption:** "AI grounded in narrative. No hallucinations. No off-script."

### Slide 3 — What's next
**Title:** "Kids write stories. Their stories become other kids' arenas."
**Body:** Three bullets:
- Multiplayer co-op and competitive modes (built on top of this engine)
- Creator mode where kids author their own stories with AI scaffolding
- 3D worlds via World Labs Marble for the Creator's spaces
**Caption:** "Powered by Anthropic Claude, [VOICE PROVIDER ← REPLACE], Phaser, World Labs."

## 12. Risk register and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Hackathon wifi fails | Medium | Low | Pre-cached audio = no API calls during demo. Backup video on phone |
| Browser blocks audio autoplay | Medium | Low | Audio context unlocked on title screen tap |
| Phaser fails on judge's projector resolution | Low | High | Test on external monitor before demo. Game uses Phaser.Scale.FIT |
| Asset generation runs over time tonight | Medium | Low | Code falls back to colored circles gracefully |
| Drag-and-drop fails on touch device | Medium | High | Phaser handles both natively. Test on tablet tonight |
| xAI API signup blocked by credit card requirement | Medium | Low | Default to ElevenLabs. Decision rule already handles this |
| Voice audition produces no clear winner | Low | Low | Default to ElevenLabs. Existing integration |
| MP3 file fails to load | Low | Low | Bubble text still shows; demo continues silent for that response |
| Pre-cached MP3 doesn't match bubble text exactly | Medium | Medium | Generate from EXACT locked string in section 5; verify by listening |
| `success.mp3` and `masterword.mp3` both play on win | Medium | Medium | Section 8.2 conditional explicitly prevents this |
| Mowgli's voice buried under celebration SFX | Medium | Low | Lower SFX volume in `safePlay` from 0.5 to 0.3 |
| Judge taps after celebration, breaks demo | Medium | Medium | Section 8.3 freeze logic + "Mowgli is safe!" overlay |

## 13. Hard cuts — say no during the build

- A second story beyond Jungle Book Chapter 3
- Multiplayer of any kind
- Creator Mode (where kids write stories)
- Marble / World Labs 3D worlds
- Live AI generation in the demo path
- Scoring system or leaderboards
- User accounts or login
- Mobile native app
- Any database integration
- Avatar customization
- Sound toggles, settings menus, accessibility menus
- Multilingual support
- Parental controls UI

Each is a 4+ hour rabbit hole. None move the demo. All are good v2 ideas — say so on Slide 3.

## 14. Demo presentation script (60 seconds)

Replace `[VOICE PROVIDER]` after audition. Practice verbatim 5+ times.

> "Most kids' apps treat reading and play as two separate things. Story Royale fuses them. Watch.
>
> [Tap into title screen, let storybook play one page]
>
> "The child reads — or has read to them — a real story. Here's The Jungle Book, Chapter 3. Mowgli's been kidnapped by monkeys.
>
> [Skip to arena]
>
> "Now they enter the story's world to help him. Five objects. They have to figure out which one fits the story's rules.
>
> [Drag parrot onto Mowgli]
>
> "Mowgli answers IN CHARACTER, grounded in the story's actual logic. 'Parrots chatter but cannot carry a true message.' That's not a hallucination — we extract a rule bible from the text and constrain Claude to it.
>
> [Drag Chil + Master-word]
>
> "The right answer needs both: Chil who can fly, and the master-word Baloo taught Mowgli. Reading the story IS playing the game.
>
> [Show Slide 1]
>
> "We're Artory.AI — already shipping personalized AI stories to families. Story Royale is what happens when those stories become playable. Multiplayer, creator mode, 3D worlds — all on the roadmap. Today's MVP runs on Claude Haiku, [VOICE PROVIDER ← REPLACE], and Phaser. Built in 24 hours. Thank you."

## 15. File-level checklist

```
story-royale/
├── package.json                       ✓ (in scaffold)
├── tsconfig.json                      ✓
├── next.config.js                     ✓
├── .env.local                         ← CREATE: ANTHROPIC_API_KEY, XAI_API_KEY,
│                                       TTS_PROVIDER, MOWGLI_VOICE_ID, NARRATOR_VOICE_ID
├── .env.local.example                 ✓
├── .gitignore                         ✓
├── README.md                          ✓
├── audition.sh                        ← TONIGHT (section 6.3)
├── app/
│   ├── layout.tsx                     ✓
│   ├── page.tsx                       ✓
│   ├── PhaserGame.tsx                 ✓
│   └── api/
│       ├── protagonist/route.ts       ✓ (THE IP, fallback only in demo)
│       └── voice/route.ts             ✓ (fallback only in demo)
├── src/
│   ├── data/
│   │   └── storyBible.ts              ✓
│   └── scenes/
│       ├── TitleScene.ts              ✓
│       ├── StorybookScene.ts          ✓
│       └── ArenaScene.ts              ⚠️ UPDATE per section 8 (3 changes)
└── public/assets/
    ├── images/
    │   ├── cold-lairs-bg.png          ← TONIGHT
    │   ├── mowgli.png                 ← TONIGHT
    │   ├── chil.png                   ← TONIGHT
    │   ├── masterword.png             ← TONIGHT
    │   ├── parrot.png                 ← TONIGHT
    │   ├── stone.png                  ← TONIGHT
    │   ├── vine.png                   ← TONIGHT
    │   ├── page1.png                  ← TONIGHT
    │   ├── page2.png                  ← TONIGHT
    │   ├── page3.png                  ← TONIGHT
    │   └── page4.png                  ← TONIGHT
    └── audio/
        ├── narration1.mp3             ← TONIGHT (NARRATOR voice)
        ├── narration2.mp3             ← TONIGHT (NARRATOR voice)
        ├── narration3.mp3             ← TONIGHT (NARRATOR voice)
        ├── narration4.mp3             ← TONIGHT (NARRATOR voice)
        ├── pickup.mp3                 ← FREESOUND TONIGHT
        ├── drop.mp3                   ← FREESOUND TONIGHT
        ├── celebration.mp3            ← FREESOUND TONIGHT (sparkle SFX, NOT response)
        ├── hmm.mp3                    ← FREESOUND TONIGHT
        └── responses/
            ├── greeting.mp3           ← TONIGHT (MOWGLI voice)
            ├── chil.mp3               ← TONIGHT (MOWGLI voice)
            ├── masterword.mp3         ← TONIGHT (MOWGLI voice)
            ├── parrot.mp3             ← TONIGHT (MOWGLI voice)
            ├── stone.mp3              ← TONIGHT (MOWGLI voice)
            ├── vine.mp3               ← TONIGHT (MOWGLI voice)
            └── success.mp3            ← TONIGHT (MOWGLI voice — Mowgli's win line)
```

## 16. The single most important thing

**A 200ms response feels alive. A 2-second response feels broken.**

Pre-caching the audio is what makes Mowgli feel alive on stage regardless of network conditions, API status, or unfamiliar venue hardware. Live AI is the architecture story for the deck; pre-cached MP3s are the demo story.

Two voices, well-cast, distinct from each other, are what make the storybook → arena transition feel like entering a world rather than continuing to read a book. Get the audition right and the rest follows.

---

**Now go run the audition.**
