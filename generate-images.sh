#!/bin/bash
source .env.local

IMGDIR="public/assets/images"
mkdir -p "$IMGDIR"
PREFIX="Children's storybook illustration, painterly hand-drawn style, warm color palette, soft lighting, Studio Ghibli influence, no text,"

generate_image() {
  local filename="$1"
  local suffix="$2"
  local aspect="$3"
  local prompt="${PREFIX} ${suffix}"

  echo "  Generating $filename..."
  local url
  url=$(curl -s -X POST "https://api.ideogram.ai/generate" \
    -H "Api-Key: $IDEOGRAM_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"image_request\": {
        \"prompt\": \"$prompt\",
        \"aspect_ratio\": \"$aspect\",
        \"model\": \"V_2\"
      }
    }" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][0]['url'])" 2>/dev/null)

  if [ -n "$url" ] && [ "$url" != "N/A" ]; then
    curl -s "$url" --output "$IMGDIR/$filename"
    echo "    -> saved $filename ($(wc -c < "$IMGDIR/$filename") bytes)"
  else
    echo "    -> FAILED for $filename"
  fi
}

echo "=== ARENA ASSETS (1:1) ==="
generate_image "mowgli.png" "young boy with dark skin and tousled black hair, brave determined expression, wearing a simple loincloth, standing tall, isolated on transparent background, full body" "ASPECT_1_1" &
generate_image "chil.png" "a brown kite (bird of prey), wings spread mid-flight, viewed from below against sky, Indian forest hawk, no background" "ASPECT_1_1" &
generate_image "masterword.png" "an ancient rolled scroll with a soft golden glow, wrapped in twine, slightly weathered parchment, no background" "ASPECT_1_1" &
generate_image "parrot.png" "a bright green parakeet perched on a small vine, alert expression, tropical bird, no background" "ASPECT_1_1" &
generate_image "stone.png" "a glittering polished stone with golden highlights, smooth and round, treasure-like, no background" "ASPECT_1_1" &
wait

generate_image "vine.png" "a thick green jungle vine, hanging vertically with leaves, slightly curled, no background" "ASPECT_1_1" &

echo "=== BACKGROUND (16:9) ==="
generate_image "cold-lairs-bg.png" "ruined ancient Indian temple at dusk, vines growing over broken stone pillars, dense jungle background, warm golden light filtering through trees, atmospheric, fireflies, wide landscape view, no characters" "ASPECT_16_9" &
wait

echo "=== STORYBOOK PAGES (4:3) ==="
generate_image "page1.png" "Mowgli the man-cub sleeping peacefully in the jungle with Baloo the bear nearby and gray wolves around them, peaceful nighttime jungle scene, warm and safe" "ASPECT_4_3" &
generate_image "page2.png" "monkeys lifting a young boy through the jungle treetops, swinging from vine to vine, the boy looking surprised, dappled sunlight" "ASPECT_4_3" &
generate_image "page3.png" "ancient ruined Indian temple with broken pillars and overgrown vines at dusk, atmospheric and mysterious, no characters" "ASPECT_4_3" &
generate_image "page4.png" "Mowgli looking up at a kite flying high in the sky above ruined temple walls, hopeful expression, scroll in hand" "ASPECT_4_3" &
wait

echo ""
echo "=== All images done! ==="
ls -la "$IMGDIR"
