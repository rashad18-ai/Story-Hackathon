import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { DEMO_STORY_BIBLE } from "@/src/data/storyBible";
import { StoryBible } from "@/src/data/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { objectIds } = body;
    const story: StoryBible = body.storyBible || DEMO_STORY_BIBLE;
    const ids: string[] = Array.isArray(objectIds) ? objectIds : [objectIds];

    const isCorrectSolution =
      story.solution.every((s) => ids.includes(s)) &&
      ids.length === story.solution.length;

    const primaryObject =
      story.objects.find((o) => o.id === ids[ids.length - 1]) ||
      story.objects.find((o) => o.id === ids[0]);

    if (!primaryObject) {
      return NextResponse.json({ text: "I don't recognize that.", isCorrect: false });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && apiKey !== "sk-ant-your-key-here") {
      try {
        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 100,
          system: buildSystemPrompt(story),
          messages: [
            {
              role: "user",
              content: buildUserMessage(story, ids, isCorrectSolution),
            },
          ],
        });
        const textBlock = response.content.find((b) => b.type === "text");
        const dynamicText =
          textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

        if (dynamicText) {
          return NextResponse.json({
            text: dynamicText,
            isCorrect: isCorrectSolution,
            source: "claude",
          });
        }
      } catch (err) {
        console.error("Claude API error, falling back:", err);
      }
    }

    if (isCorrectSolution) {
      return NextResponse.json({
        text: story.successMessage,
        isCorrect: true,
        source: "fallback",
      });
    }

    return NextResponse.json({
      text: primaryObject.responseText,
      isCorrect: false,
      source: "fallback",
    });
  } catch (err) {
    console.error("Protagonist route error:", err);
    return NextResponse.json(
      { text: "I cannot hear you, friend. Try again.", isCorrect: false, source: "error" },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(story: StoryBible): string {
  const rulesText = story.rules.map((r, i) => `  ${i + 1}. ${r}`).join("\n");
  const objectsText = story.objects
    .map((o) => `  - ${o.name}: ${o.description}`)
    .join("\n");

  return `You are ${story.protagonist.name} from "${story.title}".
${story.protagonist.description}.
You speak in a ${story.protagonist.voice} way.

YOUR CURRENT SITUATION:
${story.hurdle.description}
Your goal: ${story.hurdle.goal}.

THE STORY ESTABLISHES THESE RULES (your bible — never contradict them):
${rulesText}

OBJECTS A CHILD MIGHT BRING YOU:
${objectsText}

RESPONSE RULES:
- Reply in 1-2 short sentences (max 25 words).
- Stay in character as ${story.protagonist.name}. Never break the fourth wall.
- Never use the words "wrong", "incorrect", "right", or "correct".
- If the object helps: be excited, explain WHY using the story's logic.
- If the object doesn't fit: gently explain WHY using the story's rules. Use phrases like "Hmm, but remember..." or "That won't help, because...". Hint at what might work.
- Speak warmly. The child is helping you.
- Never mention scoring, points, or that this is a game.`;
}

function buildUserMessage(story: StoryBible, ids: string[], isCorrectSolution: boolean): string {
  const objects = ids
    .map((id) => story.objects.find((o) => o.id === id))
    .filter(Boolean)
    .map((o) => o!.name);

  if (isCorrectSolution) {
    return `A child has just brought you ALL of these together: ${objects.join(" AND ")}. This is the complete solution. React with joy and gratitude — you can finally send your message.`;
  }
  if (objects.length > 1) {
    return `A child has brought you these objects together: ${objects.join(" and ")}. React in character based on the story's rules.`;
  }
  return `A child has just brought you this: ${objects[0]}. React in character based on the story's rules.`;
}
