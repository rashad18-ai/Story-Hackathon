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

    // --- Floating particles: mix of stars, sparkles, and circles ---
    const particleColors = [0xffd700, 0xff9f7f, 0xc4b5fd];
    for (let i = 0; i < 30; i++) {
      const color = Phaser.Utils.Array.GetRandom(particleColors);
      const startX = Phaser.Math.Between(0, width);
      const startY = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(2, 5);
      const shapeType = Phaser.Math.Between(0, 2); // 0=circle, 1=4-pointed star, 2=diamond

      let particle: Phaser.GameObjects.GameObject;

      if (shapeType === 0) {
        // Small circle sparkle
        particle = this.add.circle(startX, startY, size, color, 0.6);
      } else {
        // 4-pointed star or diamond drawn with graphics
        const g = this.add.graphics();
        g.setPosition(startX, startY);
        g.fillStyle(color, 0.7);

        if (shapeType === 1) {
          // 4-pointed star
          const s = size;
          g.fillPoints(
            [
              new Phaser.Geom.Point(0, -s * 2),
              new Phaser.Geom.Point(s * 0.5, -s * 0.5),
              new Phaser.Geom.Point(s * 2, 0),
              new Phaser.Geom.Point(s * 0.5, s * 0.5),
              new Phaser.Geom.Point(0, s * 2),
              new Phaser.Geom.Point(-s * 0.5, s * 0.5),
              new Phaser.Geom.Point(-s * 2, 0),
              new Phaser.Geom.Point(-s * 0.5, -s * 0.5),
            ],
            true
          );
        } else {
          // Small diamond
          const s = size;
          g.fillPoints(
            [
              new Phaser.Geom.Point(0, -s * 1.5),
              new Phaser.Geom.Point(s, 0),
              new Phaser.Geom.Point(0, s * 1.5),
              new Phaser.Geom.Point(-s, 0),
            ],
            true
          );
        }
        particle = g;
      }

      // Drift upward with gentle horizontal sway
      const driftDuration = Phaser.Math.Between(6000, 12000);
      this.tweens.add({
        targets: particle,
        y: `-=${Phaser.Math.Between(80, 200)}`,
        x: `+=${Phaser.Math.Between(-40, 40)}`,
        alpha: { from: 0.15, to: 0.75 },
        duration: driftDuration,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      // Additional horizontal sway
      this.tweens.add({
        targets: particle,
        x: `+=${Phaser.Math.Between(-25, 25)}`,
        duration: Phaser.Math.Between(3000, 5000),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // --- Title with entrance animation ---
    const titleShadow = this.add
      .text(width / 2 + 3, height * 0.3 + 3, "Story Royale", {
        fontSize: "68px",
        color: "#000000",
        fontFamily: "Fredoka, Nunito, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0);

    const title = this.add
      .text(width / 2, height * 0.3, "Story Royale", {
        fontSize: "68px",
        color: "#fdf6e3",
        fontFamily: "Fredoka, Nunito, sans-serif",
        fontStyle: "bold",
        stroke: "#6b4423",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0);

    // Title entrance: scale from 0 + fade in
    this.tweens.add({
      targets: [title, titleShadow],
      scale: 1,
      alpha: { from: 0, to: 1 },
      duration: 800,
      ease: "Cubic.easeOut",
      onComplete: () => {
        // Shadow stays at reduced alpha
        titleShadow.setAlpha(0.25);
        // Start the gentle float after entrance
        this.tweens.add({
          targets: [title, titleShadow],
          y: "-=6",
          duration: 3000,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      },
    });

    // Subtitle — fades in 400ms after title starts
    const subtitle = this.add
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
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 600,
      delay: 400,
      ease: "Sine.easeOut",
    });

    // --- Decorative flourish divider between subtitle and chapter card ---
    const flourish = this.add.graphics();
    flourish.setAlpha(0);
    const flourishY = height * 0.50;
    const lineHalfW = 70;
    const diamondSize = 4;

    // Center line
    flourish.lineStyle(1.5, 0xd4a574, 0.6);
    flourish.lineBetween(width / 2 - lineHalfW, flourishY, width / 2 + lineHalfW, flourishY);

    // Left diamond
    flourish.fillStyle(0xd4a574, 0.7);
    flourish.fillPoints(
      [
        new Phaser.Geom.Point(width / 2 - lineHalfW, flourishY - diamondSize),
        new Phaser.Geom.Point(width / 2 - lineHalfW + diamondSize, flourishY),
        new Phaser.Geom.Point(width / 2 - lineHalfW, flourishY + diamondSize),
        new Phaser.Geom.Point(width / 2 - lineHalfW - diamondSize, flourishY),
      ],
      true
    );

    // Right diamond
    flourish.fillPoints(
      [
        new Phaser.Geom.Point(width / 2 + lineHalfW, flourishY - diamondSize),
        new Phaser.Geom.Point(width / 2 + lineHalfW + diamondSize, flourishY),
        new Phaser.Geom.Point(width / 2 + lineHalfW, flourishY + diamondSize),
        new Phaser.Geom.Point(width / 2 + lineHalfW - diamondSize, flourishY),
      ],
      true
    );

    // Center diamond (small accent)
    const cdSize = 3;
    flourish.fillPoints(
      [
        new Phaser.Geom.Point(width / 2, flourishY - cdSize),
        new Phaser.Geom.Point(width / 2 + cdSize, flourishY),
        new Phaser.Geom.Point(width / 2, flourishY + cdSize),
        new Phaser.Geom.Point(width / 2 - cdSize, flourishY),
      ],
      true
    );

    this.tweens.add({
      targets: flourish,
      alpha: 1,
      duration: 500,
      delay: 800,
      ease: "Sine.easeOut",
    });

    // --- Chapter card with warm inner glow and slide-up bounce ---
    const cardX = width / 2 - 180;
    const cardY = height * 0.55;
    const cardW = 360;
    const cardH = 100;
    const cardR = 16;
    const cardOffsetY = 60; // slide up from this far below

    const cardShadow = this.add.graphics();
    cardShadow.fillStyle(0x000000, 0.15);
    cardShadow.fillRoundedRect(cardX + 4, cardY + 4, cardW - 8, cardH, cardR);
    cardShadow.setAlpha(0);
    cardShadow.setPosition(0, cardOffsetY);

    const card = this.add.graphics();
    // Warm inner glow: outer ring slightly tinted, center bright
    card.fillStyle(0xf5e6d0, 0.95);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, cardR);
    // Inner lighter fill for glow effect
    card.fillStyle(0xfdf6e3, 0.9);
    card.fillRoundedRect(cardX + 6, cardY + 6, cardW - 12, cardH - 12, cardR - 2);
    // Even lighter center
    card.fillStyle(0xfffdf8, 0.85);
    card.fillRoundedRect(cardX + 14, cardY + 14, cardW - 28, cardH - 28, cardR - 4);
    card.lineStyle(2, 0xd4a574, 0.6);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, cardR);
    card.setAlpha(0);
    card.setPosition(0, cardOffsetY);

    const chapterTitle = this.add
      .text(width / 2, height * 0.585, story.title, {
        fontSize: "26px",
        color: "#2c2c2a",
        fontFamily: "Nunito, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);
    chapterTitle.y += cardOffsetY;

    const chapterSubtitle = this.add
      .text(width / 2, height * 0.635, story.setting.name, {
        fontSize: "15px",
        color: "#8b6f47",
        fontFamily: "Nunito, sans-serif",
      })
      .setOrigin(0.5)
      .setAlpha(0);
    chapterSubtitle.y += cardOffsetY;

    // Decorative divider inside card
    const cardDivider = this.add.graphics();
    cardDivider.lineStyle(1, 0xd4a574, 0.4);
    cardDivider.lineBetween(width / 2 - 60, height * 0.61, width / 2 + 60, height * 0.61);
    cardDivider.setAlpha(0);
    cardDivider.setPosition(0, cardOffsetY);

    // Slide up with bounce
    const cardElements = [cardShadow, card, chapterTitle, chapterSubtitle, cardDivider];
    this.tweens.add({
      targets: cardElements,
      y: `-=${cardOffsetY}`,
      alpha: 1,
      duration: 900,
      delay: 900,
      ease: "Back.easeOut",
    });

    // --- Start button with golden glow halo ---
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
    // Golden glow halo behind button
    const glow = this.add.graphics();
    glow.fillStyle(0xffd700, 0.12);
    glow.fillEllipse(0, 0, 300, 90);
    glow.fillStyle(0xffd700, 0.08);
    glow.fillEllipse(0, 0, 340, 110);

    // Pulse the glow
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.6, to: 1 },
      scaleX: { from: 1, to: 1.08 },
      scaleY: { from: 1, to: 1.06 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

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

    const container = this.add.container(x, y, [glow, shadow, bg, text]);
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

    // Button pulse — more noticeable than before
    this.tweens.add({
      targets: container,
      scale: { from: 1, to: 1.04 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    return container;
  }
}
