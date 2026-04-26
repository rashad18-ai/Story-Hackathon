import { NextRequest, NextResponse } from "next/server";

interface ImageRequest {
  id: string;
  prompt: string;
  aspectRatio?: string;
}

async function generateWithIdeogram(
  prompt: string,
  apiKey: string,
  aspectRatio: string = "ASPECT_1_1"
): Promise<string | null> {
  try {
    const isBackground = aspectRatio !== "ASPECT_1_1";
    const styleHint = isBackground
      ? "children's book illustration style, atmospheric, painterly, no text"
      : "children's book illustration style, simple, colorful, white background";

    const res = await fetch("https://api.ideogram.ai/generate", {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_request: {
          prompt: `${prompt}, ${styleHint}`,
          aspect_ratio: aspectRatio,
          model: "V_2",
          magic_prompt_option: "AUTO",
        },
      }),
    });

    if (!res.ok) {
      console.error("Ideogram error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const imageUrl = data?.data?.[0]?.url;
    if (!imageUrl) return null;

    // Fetch the image and convert to base64 data URL
    const imgRes = await fetch(imageUrl);
    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch (err) {
    console.error("Image generation error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { requests } = (await req.json()) as { requests: ImageRequest[] };

    const apiKey = process.env.IDEOGRAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No image API key" }, { status: 500 });
    }

    // Generate images in parallel (max 3 concurrent to avoid rate limits)
    const results: Record<string, string> = {};
    const batches: ImageRequest[][] = [];
    for (let i = 0; i < requests.length; i += 3) {
      batches.push(requests.slice(i, i + 3));
    }

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(async (r) => {
          const dataUrl = await generateWithIdeogram(r.prompt, apiKey, r.aspectRatio);
          return { id: r.id, dataUrl };
        })
      );
      for (const r of batchResults) {
        if (r.dataUrl) results[r.id] = r.dataUrl;
      }
    }

    return NextResponse.json({ images: results });
  } catch (err) {
    console.error("Generate images error:", err);
    return NextResponse.json({ error: "Failed to generate images" }, { status: 500 });
  }
}
