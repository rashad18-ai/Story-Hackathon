"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import StoryInput from "./StoryInput";
import { StoryBible, GeneratedAssets } from "@/src/data/types";
import { setStory, loadDemoStory } from "@/src/data/storyStore";

const PhaserGame = dynamic(() => import("./PhaserGame"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a3a2e",
        color: "#fdf6e3",
        fontFamily: "Nunito, sans-serif",
        fontSize: "20px",
      }}
    >
      Loading Story Royale…
    </div>
  ),
});

export default function Home() {
  const [mode, setMode] = useState<"input" | "game">("input");

  function handlePlayDemo() {
    loadDemoStory();
    setMode("game");
  }

  function handleStoryReady(bible: StoryBible, assets: GeneratedAssets | null) {
    setStory(bible, assets, true);
    setMode("game");
  }

  if (mode === "input") {
    return (
      <StoryInput onStoryReady={handleStoryReady} onPlayDemo={handlePlayDemo} />
    );
  }

  return <PhaserGame />;
}
