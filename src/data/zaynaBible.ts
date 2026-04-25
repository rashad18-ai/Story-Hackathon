import { StoryBible } from "./types";

export const ZAYNA_STORY_BIBLE: StoryBible = {
  title: "The Floating Adventure",
  protagonist: {
    name: "Zayna",
    description: "A 6-year-old girl who just discovered her telekinesis powers",
    voice: "excited, curious, a bit shy about her new abilities",
    imagePrompt:
      "A young girl with bright eyes and a pink backpack, looking amazed and slightly nervous, surrounded by floating leaves and small objects, Studio Ghibli painterly style",
  },
  setting: {
    name: "Magical Redwood Grove",
    description:
      "A hidden grove with glowing plants and a sparkling waterfall",
    backgroundPrompt:
      "A mystical forest grove with giant redwood trees, glowing ethereal plants, a crystal clear waterfall, and soft magical light filtering through the canopy, Studio Ghibli painterly style",
  },
  hurdle: {
    description:
      "Zayna's family is trapped on the other side of a wide stream that suddenly appeared, and she needs to help them cross safely",
    goal: "Help her family cross the water safely",
  },
  rules: [
    "Zayna can lift and move objects with her mind using telekinesis",
    "Objects need to be light enough for a 6-year-old's telekinetic power to handle",
    "The stream is too wide to jump across and too deep to wade through",
    "Wooden objects can float on water and support weight",
    "Heavy stone objects are too difficult for Zayna's developing powers to lift",
    "Sharp or dangerous objects should never be used around family",
    "Two objects working together can create a safe bridge or crossing",
  ],
  objects: [
    {
      id: "wooden_log",
      name: "Fallen Tree Branch",
      description: "A sturdy wooden branch that could span the stream",
      isCorrect: true,
      reasoning:
        "Wood floats and Zayna can lift it with her telekinesis to create part of a bridge",
      responseText:
        "Perfect! I can feel my power lifting this branch. It's light enough for me to move!",
      imagePrompt:
        "A smooth, sturdy wooden tree branch lying on mossy ground, Studio Ghibli painterly style",
    },
    {
      id: "rope_vine",
      name: "Strong Vine",
      description: "A long, thick vine hanging from the trees",
      isCorrect: true,
      reasoning:
        "The vine can be used with the branch to secure a safe crossing",
      responseText:
        "This vine feels strong! I can use my powers to tie it tight and make our bridge super safe!",
      imagePrompt:
        "A thick, green vine with leaves hanging down from tall trees, looking sturdy and natural, Studio Ghibli painterly style",
    },
    {
      id: "heavy_boulder",
      name: "Large Rock",
      description: "A big stone that could block the water",
      isCorrect: false,
      reasoning:
        "Too heavy for Zayna's developing telekinetic powers to lift",
      responseText:
        "Oh no! This rock is way too heavy for me to lift. My powers aren't strong enough yet!",
      imagePrompt:
        "A large, moss-covered boulder sitting beside a stream, too big for a child to move, Studio Ghibli painterly style",
    },
    {
      id: "sharp_stick",
      name: "Pointed Branch",
      description: "A sharp, splintery stick that broke off a tree",
      isCorrect: false,
      reasoning:
        "Too dangerous to use around family members, could cause injury",
      responseText:
        "This stick looks too sharp and dangerous. I don't want anyone to get hurt!",
      imagePrompt:
        "A jagged, broken tree branch with sharp points and splinters, looking dangerous, Studio Ghibli painterly style",
    },
    {
      id: "flower_petals",
      name: "Pretty Flower Petals",
      description: "Colorful petals that smell wonderful",
      isCorrect: false,
      reasoning:
        "Too light and fragile to support anyone crossing water",
      responseText:
        "These petals are so pretty, but they're too light and delicate to help us cross the water.",
      imagePrompt:
        "Scattered colorful flower petals floating in the air, beautiful but delicate, Studio Ghibli painterly style",
    },
  ],
  solution: ["wooden_log", "rope_vine"],
  pages: [
    {
      text: "Zayna discovered she could move things with her mind during the family hike.",
      imageKey: "page1",
      audioKey: "narration1",
      imagePrompt:
        "Zayna with wide, amazed eyes as a juice box floats in the air above her hands in a car, Studio Ghibli painterly style",
    },
    {
      text: "When a branch fell toward her brother Leo, Zayna stopped it mid-air with her new power.",
      imageKey: "page2",
      audioKey: "narration2",
      imagePrompt:
        "Zayna raising her hand with concentration as a large tree branch hovers in the air above her surprised family, Studio Ghibli painterly style",
    },
    {
      text: "The whole family discovered they had magical abilities in the enchanted redwood grove.",
      imageKey: "page3",
      audioKey: "narration3",
      imagePrompt:
        "The family standing together in a magical grove with glowing plants, Mom talking to a hummingbird, Dad looking at a changing map, Leo surrounded by butterflies, Studio Ghibli painterly style",
    },
    {
      text: "While exploring deeper into the grove, a rushing stream suddenly appeared, separating Zayna from her family.",
      imageKey: "page4",
      audioKey: "narration4",
      imagePrompt:
        "Zayna on one side of a wide, rushing stream looking concerned, with her family waving from the other side among tall redwood trees, Studio Ghibli painterly style",
    },
  ],
  greeting:
    "Oh no! This stream appeared so suddenly and now my family is stuck on the other side! Can you help me find the right things to make a safe bridge with my telekinesis powers?",
  successMessage:
    "Hooray! You helped me create the perfect bridge! My family can cross safely now, and we can continue our magical adventure together!",
  victoryTitle: "Bridge Builder Success!",
  victorySubtitle: "Zayna used her powers to reunite her family safely",
};
