"use client";

import { useEffect, useRef } from "react";

export default function PhaserGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<any>(null);

  useEffect(() => {
    if (!gameRef.current || phaserGameRef.current) return;

    // Dynamic import — Phaser must only load on the client
    (async () => {
      const Phaser = await import("phaser");
      const { TitleScene } = await import("@/src/scenes/TitleScene");
      const { StorybookScene } = await import("@/src/scenes/StorybookScene");
      const { ArenaScene } = await import("@/src/scenes/ArenaScene");

      const config: any = {
        type: Phaser.AUTO,
        parent: gameRef.current!,
        backgroundColor: "#1a3a2e",
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 1280,
          height: 720,
        },
        scene: [TitleScene, StorybookScene, ArenaScene],
      };

      phaserGameRef.current = new Phaser.Game(config);
    })();

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={gameRef}
      style={{
        width: "100vw",
        height: "100vh",
        background: "#1a3a2e",
      }}
    />
  );
}
