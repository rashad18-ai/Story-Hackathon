import { StoryBible, GeneratedAssets } from "./types";
import { DEMO_STORY_BIBLE } from "./storyBible";

let currentStory: StoryBible | null = null;
let currentAssets: GeneratedAssets | null = null;
let demoMode = false;

export function setStory(bible: StoryBible, assets: GeneratedAssets | null, isCustom = false) {
  currentStory = bible;
  currentAssets = assets;
  demoMode = !isCustom && assets === null;
}

export function getStory(): StoryBible {
  if (!currentStory) {
    loadDemoStory();
  }
  return currentStory!;
}

export function getAssets(): GeneratedAssets | null {
  return currentAssets;
}

export function isDemo(): boolean {
  return demoMode;
}

export function loadDemoStory() {
  currentStory = DEMO_STORY_BIBLE;
  currentAssets = null;
  demoMode = true;
}
