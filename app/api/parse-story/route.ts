import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { StoryBible } from "@/src/data/types";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a children's story game designer. You will receive a children's story broken into numbered PDF pages. Your job is to faithfully adapt it into a structured JSON game.

IMPORTANT — FAITHFULNESS:
- The hurdle, objects, and solution MUST come directly from events in the story. Do NOT invent problems or items that aren't in the source material.
- Each game page's text must closely paraphrase the actual story text from specific PDF pages.
- The protagonist, setting, and plot must match the story exactly — do not change names, locations, or events.

The game works like this:
1. The child reads 4 storybook pages that retell the story
2. Then they enter an "arena" where the protagonist needs help with the story's central challenge
3. The child must drag the correct objects to the protagonist to solve the puzzle
4. The puzzle solution comes from what actually happens in the story

OUTPUT FORMAT — return ONLY valid JSON matching this schema:
{
  "title": "Story title — use the actual story title",
  "protagonist": {
    "name": "Character name from the story",
    "description": "One-line description matching the story",
    "voice": "speaking style matching the character",
    "imagePrompt": "Detailed image generation prompt, Studio Ghibli painterly style"
  },
  "setting": {
    "name": "Location name from the story",
    "description": "Short description matching the story's setting",
    "backgroundPrompt": "Detailed image prompt for the background scene, Studio Ghibli painterly style"
  },
  "hurdle": {
    "description": "The actual problem/challenge from the story's plot",
    "goal": "What the child needs to help the protagonist do — based on the story"
  },
  "rules": [
    "Rules/facts from the story that determine which objects work (5-8 rules)"
  ],
  "objects": [
    {
      "id": "snake_case_id",
      "name": "Display name",
      "description": "Short description shown to player",
      "isCorrect": true,
      "reasoning": "Why this object solves the puzzle — must reference story events",
      "responseText": "What the protagonist says when given this (1-2 sentences, in character)",
      "imagePrompt": "Image generation prompt, Studio Ghibli style"
    }
  ],
  "solution": ["correct_id1", "correct_id2"],
  "pages": [
    {
      "text": "One sentence retelling this part of the story faithfully",
      "imageKey": "page1",
      "audioKey": "narration1",
      "imagePrompt": "Image prompt for this page illustration, Studio Ghibli painterly style",
      "sourcePageIndex": 1
    }
  ],
  "greeting": "What the protagonist says when the child enters the arena — based on the story's challenge",
  "successMessage": "What the protagonist says when the puzzle is solved — matching the story's resolution",
  "victoryTitle": "Short victory headline (3-5 words)",
  "victorySubtitle": "One-line description of the story's resolution"
}

DESIGN RULES:
- Create exactly 4 story pages that retell the story leading up to the challenge
- For each page, set sourcePageIndex to the PDF page number (1-based) whose content best matches that game page's text and illustration
- Choose 4 different sourcePageIndex values spread across the story — pick the most visually interesting and narratively important pages
- Create exactly 5 objects: 2 correct (from the story), 3 wrong (plausible distractors)
- Correct objects must be things that actually help in the story
- Wrong objects should be related to the story's world but NOT part of the solution
- The solution array must contain exactly 2 object IDs
- Keep all text age-appropriate for children ages 4-8
- Pages should be simple, one sentence each

Return ONLY the JSON object, no markdown fences, no explanation.`;

export async function POST(req: NextRequest) {
  try {
    const { storyText, pageTexts } = await req.json();

    const text = pageTexts
      ? (pageTexts as string[])
          .map((t: string, i: number) => `[PDF Page ${i + 1}]\n${t}`)
          .join("\n\n")
      : storyText;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "storyText is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "sk-ant-your-key-here") {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Parse this children's story into a game:\n\n${text}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No response from Claude" },
        { status: 500 }
      );
    }

    let parsed: StoryBible;
    try {
      const raw = textBlock.text.trim();
      const cleaned = raw.startsWith("```")
        ? raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "")
        : raw;
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Claude response as JSON", raw: textBlock.text },
        { status: 500 }
      );
    }

    if (
      !parsed.title ||
      !parsed.protagonist ||
      !parsed.objects ||
      !parsed.pages ||
      !parsed.solution
    ) {
      return NextResponse.json(
        { error: "Incomplete story bible", data: parsed },
        { status: 500 }
      );
    }

    return NextResponse.json({ storyBible: parsed });
  } catch (err) {
    console.error("Parse story error:", err);
    return NextResponse.json(
      { error: "Failed to parse story" },
      { status: 500 }
    );
  }
}
