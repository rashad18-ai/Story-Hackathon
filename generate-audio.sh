#!/bin/bash
# generate-audio.sh — generate all 11 TTS MP3s via xAI API

source .env.local

mkdir -p public/assets/audio/responses

echo "=== MOWGLI RESPONSES (Eve) ==="

declare -A MOWGLI_LINES
MOWGLI_LINES[greeting]="I am stuck here in the Cold Lairs! Help me send a message to Baloo!"
MOWGLI_LINES[chil]="Chil the Kite! Yes — he flies high and is bound by the Master-word. But I need the words too, friend!"
MOWGLI_LINES[masterword]="Ah, the Master-word that Baloo taught me! We be of one blood, ye and I. Now I just need someone to carry it."
MOWGLI_LINES[parrot]="Hmm — a parrot chatters all day, but the jungle knows parrots cannot carry a true message. Try again!"
MOWGLI_LINES[stone]="A shiny stone? The Bandar-log love these, but a stone cannot fly to Baloo. Look up to the sky, my friend."
MOWGLI_LINES[vine]="A vine is strong — but I cannot climb out of here without being seen. I need a messenger who can fly."
MOWGLI_LINES[success]="Yes! Chil, take this Master-word to Baloo: We be of one blood, ye and I. Fly fast, friend!"

for KEY in greeting chil masterword parrot stone vine success; do
  LINE="${MOWGLI_LINES[$KEY]}"
  echo "  Generating responses/$KEY.mp3..."
  curl -s -X POST https://api.x.ai/v1/tts \
    -H "Authorization: Bearer $XAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$LINE\", \"voice_id\": \"eve\", \"language\": \"en\"}" \
    --output "public/assets/audio/responses/$KEY.mp3"
done

echo ""
echo "=== NARRATOR (Leo) ==="

declare -A NARRATOR_LINES
NARRATOR_LINES[narration1]="Mowgli the man-cub lived deep in the jungle, raised by wolves and taught by Baloo the Bear."
NARRATOR_LINES[narration2]="One day the foolish Bandar-log monkeys carried Mowgli high into the trees, away from his friends."
NARRATOR_LINES[narration3]="They brought him to the Cold Lairs — a ruined city where no jungle creature dared to go."
NARRATOR_LINES[narration4]="Mowgli remembered Baloo's lesson: the Master-word, and Chil the Kite who flies above all the jungle."

for KEY in narration1 narration2 narration3 narration4; do
  LINE="${NARRATOR_LINES[$KEY]}"
  echo "  Generating $KEY.mp3..."
  curl -s -X POST https://api.x.ai/v1/tts \
    -H "Authorization: Bearer $XAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$LINE\", \"voice_id\": \"leo\", \"language\": \"en\"}" \
    --output "public/assets/audio/$KEY.mp3"
done

echo ""
echo "=== Done! 11 MP3s generated ==="
echo "Listen to verify: open public/assets/audio/responses/ and public/assets/audio/"
