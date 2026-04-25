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
