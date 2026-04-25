import * as Phaser from "phaser";
import { getStory, isDemo } from "@/src/data/storyStore";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }

  preload() {
    if (isDemo()) {
      this.load.image("title-bg", "/assets/images/cold-lairs-bg.png");
    }
  }

  create() {
    const { width, height } = this.scale;
    const story = getStory();
    this.cameras.main.setBackgroundColor("#1a3a2e");

    // Background with warm overlay
    if (this.textures.exists("title-bg")) {
      const bg = this.add.image(width / 2, height / 2, "title-bg");
      bg.setScale(Math.max(width / bg.width, height / bg.height));
      bg.setAlpha(0.35);
    }

    // Warm vignette overlay for depth
    const vignette = this.add.graphics();
    vignette.fillGradientStyle(0x1a3a2e, 0x1a3a2e, 0x1a3a2e, 0x1a3a2e, 0.8, 0, 0, 0.8);
    vignette.fillRect(0, 0, width, height);

    for (let i = 0; i < 20; i++) {
      const dot = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 3),
        0xffd700,
        0.5
      );
      this.tweens.add({
        targets: dot,
        alpha: { from: 0.15, to: 0.7 },
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
      });
    }

    const titleShadow = this.add
      .text(width / 2 + 3, height * 0.3 + 3, "Story Royale", {
        fontSize: "68px",
        color: "#000000",
        fontFamily: "Nunito, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0.25);

    const title = this.add
      .text(width / 2, height * 0.3, "Story Royale", {
        fontSize: "68px",
        color: "#fdf6e3",
        fontFamily: "Nunito, sans-serif",
        fontStyle: "bold",
        stroke: "#6b4423",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: [title, titleShadow],
      y: "-=6",
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.add
      .text(
        width / 2,
        height * 0.44,
        "Read the story.  Enter the world.  Help the hero.",
        {
          fontSize: "20px",
          color: "#d4a574",
          fontFamily: "Nunito, sans-serif",
          align: "center",
          letterSpacing: 1,
        }
      )
      .setOrigin(0.5);

    // Chapter card — driven by story data
    const cardShadow = this.add.graphics();
    cardShadow.fillStyle(0x000000, 0.15);
    cardShadow.fillRoundedRect(width / 2 - 176, height * 0.56 + 4, 352, 100, 16);

    const card = this.add.graphics();
    card.fillStyle(0xfdf6e3, 0.95);
    card.lineStyle(2, 0xd4a574, 0.6);
    card.fillRoundedRect(width / 2 - 180, height * 0.55, 360, 100, 16);
    card.strokeRoundedRect(width / 2 - 180, height * 0.55, 360, 100, 16);

    this.add
      .text(width / 2, height * 0.585, story.title, {
        fontSize: "26px",
        color: "#2c2c2a",
        fontFamily: "Nunito, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.635, story.setting.name, {
        fontSize: "15px",
        color: "#8b6f47",
        fontFamily: "Nunito, sans-serif",
      })
      .setOrigin(0.5);

    // Decorative divider line
    const divider = this.add.graphics();
    divider.lineStyle(1, 0xd4a574, 0.4);
    divider.lineBetween(width / 2 - 60, height * 0.61, width / 2 + 60, height * 0.61);

    // Start button — larger touch target (min 44px)
    this.createButton(width / 2, height * 0.82, "Start the story", () => {
      if (this.sound.locked) this.sound.unlock();
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("StorybookScene");
      });
    });
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    // Drop shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.15);
    shadow.fillRoundedRect(-128, -27, 256, 58, 29);

    const bg = this.add.graphics();
    bg.fillStyle(0xd4a574, 1);
    bg.fillRoundedRect(-130, -30, 260, 60, 30);
    bg.lineStyle(2, 0x6b4423, 0.6);
    bg.strokeRoundedRect(-130, -30, 260, 60, 30);

    const text = this.add
      .text(0, 0, label, {
        fontSize: "22px",
        color: "#2c2c2a",
        fontFamily: "Nunito, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y, [shadow, bg, text]);
    container.setSize(260, 60);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerdown", () => {
      this.tweens.add({
        targets: container,
        scale: 0.94,
        duration: 100,
        yoyo: true,
        ease: "Sine.easeOut",
        onComplete: onClick,
      });
    });
    container.on("pointerover", () => {
      this.tweens.add({ targets: container, scale: 1.06, duration: 150, ease: "Sine.easeOut" });
    });
    container.on("pointerout", () => {
      this.tweens.add({ targets: container, scale: 1, duration: 150, ease: "Sine.easeOut" });
    });

    // Gentle pulse (reduced from 1.04 to 1.02)
    this.tweens.add({
      targets: container,
      scale: { from: 1, to: 1.02 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    return container;
  }
}
