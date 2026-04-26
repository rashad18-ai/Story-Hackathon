import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text, voice } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const apiKey = process.env.XAI_API_KEY;
    const voiceId = voice || process.env.CHARACTER_VOICE_ID || process.env.MOWGLI_VOICE_ID;

    if (!apiKey || !voiceId) {
      return NextResponse.json({ audioBase64: null });
    }

    const response = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice_id: voiceId,
        language: "en",
      }),
    });

    if (!response.ok) {
      console.error("xAI TTS error:", response.status);
      return NextResponse.json({ audioBase64: null });
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return NextResponse.json({ audioBase64: base64 });
  } catch (err) {
    console.error("Voice route error:", err);
    return NextResponse.json({ audioBase64: null });
  }
}
