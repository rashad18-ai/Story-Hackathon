export interface StoryObject {
  id: string;
  name: string;
  description: string;
  isCorrect: boolean;
  reasoning: string;
  responseText: string;
  imagePrompt: string;
}

export interface StoryPage {
  text: string;
  imageKey: string;
  audioKey: string;
  imagePrompt: string;
  sourcePageIndex?: number;
}

export interface StoryBible {
  title: string;
  protagonist: {
    name: string;
    description: string;
    voice: string;
    imagePrompt: string;
  };
  setting: {
    name: string;
    description: string;
    backgroundPrompt: string;
  };
  hurdle: {
    description: string;
    goal: string;
  };
  rules: string[];
  objects: StoryObject[];
  solution: string[];
  pages: StoryPage[];
  greeting: string;
  successMessage: string;
  victoryTitle: string;
  victorySubtitle: string;
}

export interface GeneratedAssets {
  images: Map<string, string>;
  audio: Map<string, string>;
}
