import * as Phaser from "phaser";
import { getStory, getAssets, isDemo } from "@/src/data/storyStore";
import { StoryPage } from "@/src/data/types";

export class StorybookScene extends Phaser.Scene {
  private currentPage = 0;
  private pages: StoryPage[] = [];
  private pageImage?: Phaser.GameObjects.Image;
  private pageText!: Phaser.GameObjects.Text;
  private nextButton!: Phaser.GameObjects.Container;
  private currentAudio?: Phaser.Sound.BaseSound;
  private typewriterTimer?: Phaser.Time.TimerEvent;
  private progressDots: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super({ key: "StorybookScene" });
  }

  preload() {
    const story = getStory();
    const assets = getAssets();
    this.pages = story.pages;

    const demo = isDemo();
    this.pages.forEach((p, i) => {
      const imgData = assets?.images.get(p.imageKey);
      if (imgData) {
        this.load.image(p.imageKey, imgData);
      } else if (demo) {
        this.load.image(p.imageKey, `/assets/images/page${i + 1}.png`);
      }

      const audioData = assets?.audio.get(p.audioKey);
      if (audioData) {
        const binary = atob(audioData);
        const bytes = new Uint8Array(binary.length);
        for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
        const blob = new Blob([bytes], { type: "audio/mp3" });
        this.load.audio(p.audioKey, URL.createObjectURL(blob));
      } else if (demo) {
        this.load.audio(p.audioKey, `/assets/audio/narration${i + 1}.mp3`);
      }
    });
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#fdf6e3");
    this.cameras.main.fadeIn(600, 0, 0, 0);

    // Subtle paper texture effect
    const paperTexture = this.add.graphics();
    paperTexture.fillStyle(0xe8dcc8, 0.15);
    for (let i = 0; i < 8; i++) {
      const y = Phaser.Math.Between(0, height);
      paperTexture.fillRect(0, y, width, 1);
    }

    // Page progress dots
    this.createProgressDots(width, height);

    // Page text — larger for readability
    this.pageText = this.add
      .text(width / 2, height * 0.78, "", {
        fontSize: "24px",
        color: "#2c2c2a",
        fontFamily: "Nunito, sans-serif",
        align: "center",
        wordWrap: { width: width * 0.8 },
        lineSpacing: 10,
      })
      .setOrigin(0.5);

    // Next button
    this.nextButton = this.createButton(width / 2, height - 55, "Next  \u2192", () =>
      this.advance()
    );

    this.showPage(0);
  }

  private createProgressDots(width: number, height: number) {
    const dotSpacing = 20;
    const totalWidth = (this.pages.length - 1) * dotSpacing;
    const startX = width / 2 - totalWidth / 2;

    for (let i = 0; i < this.pages.length; i++) {
      const dot = this.add.circle(
        startX + i * dotSpacing,
        height * 0.68,
        4,
        i === 0 ? 0xd4a574 : 0xd4a574,
        i === 0 ? 1 : 0.25
      );
      this.progressDots.push(dot);
    }
  }

  private updateProgressDots(index: number) {
    this.progressDots.forEach((dot, i) => {
      this.tweens.add({
        targets: dot,
        alpha: i <= index ? 1 : 0.25,
        scale: i === index ? 1.3 : 1,
        duration: 250,
        ease: "Sine.easeOut",
      });
      dot.setFillStyle(0xd4a574);
    });
  }

  private typewriterText(fullText: string, durationMs: number) {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }
    this.pageText.setText("");

    const chars = fullText.split("");
    const charDelay = Math.max(25, durationMs / chars.length);
    let index = 0;

    this.typewriterTimer = this.time.addEvent({
      delay: charDelay,
      repeat: chars.length - 1,
      callback: () => {
        index++;
        this.pageText.setText(fullText.substring(0, index));
      },
    });
  }

  private showPage(index: number) {
    const page = this.pages[index];
    const { width, height } = this.scale;

    // Update progress
    this.updateProgressDots(index);

    // Fade out old image with slide
    if (this.pageImage) {
      const oldImg = this.pageImage;
      this.tweens.add({
        targets: oldImg,
        alpha: 0,
        x: oldImg.x - 50,
        duration: 300,
        ease: "Sine.easeIn",
        onComplete: () => oldImg.destroy(),
      });
      this.pageImage = undefined;
    }

    if (this.textures.exists(page.imageKey)) {
      this.pageImage = this.add.image(width / 2 + 50, height * 0.35, page.imageKey);
      const targetW = width * 0.75;
      const targetH = height * 0.52;
      const scaleToFit = Math.max(targetW / this.pageImage.width, targetH / this.pageImage.height);
      this.pageImage.setScale(scaleToFit);
      this.pageImage.setAlpha(0);

      // Rounded mask for storybook illustrations
      const imgW = this.pageImage.displayWidth;
      const imgH = this.pageImage.displayHeight;
      const maskShape = this.add.graphics().setVisible(false);
      maskShape.fillStyle(0xffffff);
      maskShape.fillRoundedRect(
        width / 2 - imgW / 2,
        height * 0.35 - imgH / 2,
        imgW,
        imgH,
        20
      );
      this.pageImage.setMask(maskShape.createGeometryMask());

      // Drop shadow behind image
      const imgShadow = this.add.graphics();
      imgShadow.fillStyle(0x000000, 0.08);
      imgShadow.fillRoundedRect(
        width / 2 - imgW / 2 + 4,
        height * 0.35 - imgH / 2 + 4,
        imgW,
        imgH,
        20
      );
      imgShadow.setAlpha(0);
      this.tweens.add({ targets: imgShadow, alpha: 1, duration: 500, delay: 100 });

      // Slide + fade in
      this.tweens.add({
        targets: this.pageImage,
        alpha: 1,
        x: width / 2,
        duration: 450,
        ease: "Cubic.easeOut",
      });
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x8b6f47, 1);
      g.fillRoundedRect(width * 0.15, height * 0.1, width * 0.7, height * 0.55, 16);
      g.lineStyle(4, 0x6b4423);
      g.strokeRoundedRect(width * 0.15, height * 0.1, width * 0.7, height * 0.55, 16);
      const placeholder = this.add
        .text(width / 2, height * 0.375, `Page ${index + 1}\n(illustration)`, {
          fontSize: "20px",
          color: "#fff8e7",
          fontFamily: "Nunito, sans-serif",
          align: "center",
        })
        .setOrigin(0.5);
      this.pageImage = placeholder as unknown as Phaser.GameObjects.Image;
    }

    // Typewriter text
    this.typewriterText(page.text, 3500);

    // Audio narration
    if (this.currentAudio) {
      this.currentAudio.stop();
    }
    if (this.cache.audio.exists(page.audioKey)) {
      this.currentAudio = this.sound.add(page.audioKey);
      this.currentAudio.play();
    }

    // Update button label on last page
    const btnText = this.nextButton.getAt(2) as Phaser.GameObjects.Text;
    if (index === this.pages.length - 1) {
      btnText.setText("Enter the world  \u2192");
    } else {
      btnText.setText("Next  \u2192");
    }
  }

  private advance() {
    this.currentPage++;
    if (this.currentPage >= this.pages.length) {
      if (this.currentAudio) this.currentAudio.stop();
      if (this.typewriterTimer) this.typewriterTimer.destroy();
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("ArenaScene");
      });
      return;
    }
    this.showPage(this.currentPage);
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    // Drop shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.1);
    shadow.fillRoundedRect(-98, -23, 196, 50, 25);

    const bg = this.add.graphics();
    bg.fillStyle(0xd4a574, 1);
    bg.fillRoundedRect(-100, -25, 200, 50, 25);
    bg.lineStyle(2, 0x6b4423, 0.5);
    bg.strokeRoundedRect(-100, -25, 200, 50, 25);

    const text = this.add
      .text(0, 0, label, {
        fontSize: "20px",
        color: "#2c2c2a",
        fontFamily: "Nunito, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y, [shadow, bg, text]);
    container.setSize(200, 50);
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

    return container;
  }
}
