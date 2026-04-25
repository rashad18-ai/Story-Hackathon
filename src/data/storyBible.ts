import { StoryBible } from "./types";

export const DEMO_STORY_BIBLE: StoryBible = {
  title: "The Jungle Book — The Cold Lairs",
  protagonist: {
    name: "Mowgli",
    description: "A young boy raised by wolves in the Indian jungle",
    voice: "young, brave, slightly formal — knows the jungle's rules",
    imagePrompt: "Young boy with brown skin in a loincloth, standing in an ancient ruined temple, Studio Ghibli style",
  },
  setting: {
    name: "The Cold Lairs",
    description: "Ruined ancient temple overgrown with vines, dark sky, broken pillars",
    backgroundPrompt: "Ancient ruined temple overgrown with jungle vines, moonlit sky, broken stone pillars, mysterious atmosphere, Studio Ghibli painterly style",
  },
  hurdle: {
    description: "Mowgli has been captured by the Bandar-log monkeys and taken to the Cold Lairs. He needs to send a message to Baloo and Bagheera so they can rescue him.",
    goal: "Get a message to Baloo and Bagheera",
  },
  rules: [
    "Chil the Kite flies high over the jungle and can carry messages across great distances",
    "The phrase 'We be of one blood, ye and I' is the master-word that all jungle creatures recognize and obey",
    "Wolves cannot climb trees",
    "The Bandar-log are foolish, easily distracted, and not trusted by other jungle animals",
    "Mowgli was taught the master-words by Baloo for every animal kind",
    "Parrots are common but unreliable — they chatter but do not carry purposeful messages",
  ],
  objects: [
    {
      id: "chil",
      name: "Chil the Kite",
      description: "A great kite circling high above the ruins",
      isCorrect: true,
      reasoning: "Chil flies high and is bound by the Master-word to help. He can carry a message to Baloo.",
      responseText: "Chil the Kite! Yes \u2014 he flies high and is bound by the Master-word. But I need the words too, friend!",
      imagePrompt: "A majestic kite bird soaring above ancient ruins, warm golden light, Studio Ghibli style",
    },
    {
      id: "masterword",
      name: "The Master-word scroll",
      description: "The phrase 'We be of one blood, ye and I'",
      isCorrect: true,
      reasoning: "The master-word makes Chil duty-bound to help. Without it, even Chil might not respond.",
      responseText: "Ah, the Master-word that Baloo taught me! \u2018We be of one blood, ye and I.\u2019 Now I just need someone to carry it\u2026",
      imagePrompt: "An ancient scroll with glowing golden text, jungle setting, mystical, Studio Ghibli style",
    },
    {
      id: "parrot",
      name: "A green parrot",
      description: "A bright parrot perched in a vine",
      isCorrect: false,
      reasoning: "Parrots chatter but the story tells us they cannot carry purposeful messages — only Chil can.",
      responseText: "Hmm \u2014 a parrot chatters all day, but the jungle knows parrots cannot carry a true message. Try again!",
      imagePrompt: "A colorful green parrot perched on a jungle vine, bright feathers, Studio Ghibli style",
    },
    {
      id: "stone",
      name: "A shiny stone",
      description: "A glittering stone among the rubble",
      isCorrect: false,
      reasoning: "The Bandar-log love shiny things, but a stone cannot carry a message.",
      responseText: "A shiny stone? The Bandar-log love these, but a stone cannot fly to Baloo. Look up to the sky, my friend.",
      imagePrompt: "A glittering gemstone among ancient temple rubble, mystical glow, Studio Ghibli style",
    },
    {
      id: "vine",
      name: "A long jungle vine",
      description: "A thick green vine hanging from the ruins",
      isCorrect: false,
      reasoning: "A vine could help Mowgli climb later, but right now he needs to send a message — not climb.",
      responseText: "A vine is strong \u2014 but I cannot climb out of here without being seen. I need a messenger who can fly.",
      imagePrompt: "A thick green vine hanging from ancient stone ruins, lush jungle, Studio Ghibli style",
    },
  ],
  solution: ["chil", "masterword"],
  pages: [
    {
      text: "Mowgli the man-cub lived deep in the jungle, raised by wolves and taught by Baloo the Bear.",
      imageKey: "page1",
      audioKey: "narration1",
      imagePrompt: "Young boy playing with wolf cubs in a lush jungle clearing, warm sunlight, Studio Ghibli painterly style",
    },
    {
      text: "One day the foolish Bandar-log monkeys carried Mowgli high into the trees, away from his friends.",
      imageKey: "page2",
      audioKey: "narration2",
      imagePrompt: "Monkeys carrying a boy through jungle treetops, chaotic scene, Studio Ghibli style",
    },
    {
      text: "They brought him to the Cold Lairs — a ruined city where no jungle creature dared to go.",
      imageKey: "page3",
      audioKey: "narration3",
      imagePrompt: "Ancient ruined temple city in moonlight, overgrown with vines, eerie atmosphere, Studio Ghibli style",
    },
    {
      text: "Mowgli remembered Baloo's lesson: the Master-word, and Chil the Kite who flies above all the jungle.",
      imageKey: "page4",
      audioKey: "narration4",
      imagePrompt: "Boy looking up at a kite bird soaring in golden sky above ruins, hopeful expression, Studio Ghibli style",
    },
  ],
  greeting: "I am stuck here in the Cold Lairs! Help me send a message to Baloo!",
  successMessage: "Yes! Chil, take this Master-word to Baloo: \u2018We be of one blood, ye and I.\u2019 Fly fast, friend!",
  victoryTitle: "Mowgli is safe!",
  victorySubtitle: "Chil carries the Master-word to Baloo",
};

// Backward-compatible export
export const STORY_BIBLE = DEMO_STORY_BIBLE;
export type GameObject = (typeof DEMO_STORY_BIBLE.objects)[number];
