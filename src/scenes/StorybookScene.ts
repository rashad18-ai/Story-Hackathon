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
  private progressDots: Phaser.GameObjects.Container[] = [];
  private cornerFlourishes?: Phaser.GameObjects.Graphics;
  private textPanel?: Phaser.GameObjects.Graphics;
  private textPanelShadow?: Phaser.GameObjects.Graphics;
  private sparkles: Phaser.GameObjects.Graphics[] = [];
  private sparkleTweens: Phaser.Tweens.Tween[] = [];

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

    // Page progress dots (mini book-page icons)
    this.createProgressDots(width, height);

    // Text panel background (parchment reading area)
    this.createTextPanel(width, height);

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
    this.nextButton = this.createButton(width / 2, height - 55, this.getButtonLabel(0), () =>
      this.advance()
    );

    this.showPage(0);
  }

  /* ── Text panel (parchment reading area) ── */
  private createTextPanel(width: number, height: number) {
    const panelW = width * 0.88;
    const panelH = height * 0.2;
    const panelX = width / 2 - panelW / 2;
    const panelY = height * 0.78 - panelH / 2;

    // Soft shadow behind the panel
    this.textPanelShadow = this.add.graphics();
    this.textPanelShadow.fillStyle(0x000000, 0.06);
    this.textPanelShadow.fillRoundedRect(panelX + 3, panelY + 3, panelW, panelH, 14);

    // Parchment panel
    this.textPanel = this.add.graphics();
    this.textPanel.fillStyle(0xf5f0e1, 1);
    this.textPanel.fillRoundedRect(panelX, panelY, panelW, panelH, 14);
    this.textPanel.lineStyle(1, 0xd4c9a8, 0.5);
    this.textPanel.strokeRoundedRect(panelX, panelY, panelW, panelH, 14);
  }

  /* ── Corner flourishes on the illustration ── */
  private drawCornerFlourishes(
    cx: number,
    cy: number,
    imgW: number,
    imgH: number
  ) {
    if (this.cornerFlourishes) {
      this.cornerFlourishes.destroy();
    }
    const g = this.add.graphics();
    g.lineStyle(2, 0x8b6f47, 0.4);

    const left = cx - imgW / 2;
    const right = cx + imgW / 2;
    const top = cy - imgH / 2;
    const bottom = cy + imgH / 2;
    const len = 28; // flourish arm length
    const offset = 6; // inset from the image edge

    // Each corner: two curved lines forming an L-like flourish with a subtle curve
    const corners: { x: number; y: number; dx: number; dy: number }[] = [
      { x: left + offset, y: top + offset, dx: 1, dy: 1 }, // top-left
      { x: right - offset, y: top + offset, dx: -1, dy: 1 }, // top-right
      { x: left + offset, y: bottom - offset, dx: 1, dy: -1 }, // bottom-left
      { x: right - offset, y: bottom - offset, dx: -1, dy: -1 }, // bottom-right
    ];

    for (const c of corners) {
      // Horizontal arm with curve
      const curve1 = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(c.x, c.y),
        new Phaser.Math.Vector2(c.x + c.dx * len * 0.5, c.y - c.dy * 4),
        new Phaser.Math.Vector2(c.x + c.dx * len, c.y)
      );
      curve1.draw(g, 16);

      // Vertical arm with curve
      const curve2 = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(c.x, c.y),
        new Phaser.Math.Vector2(c.x - c.dx * 4, c.y + c.dy * len * 0.5),
        new Phaser.Math.Vector2(c.x, c.y + c.dy * len)
      );
      curve2.draw(g, 16);

      // Small corner dot
      g.fillStyle(0x8b6f47, 0.35);
      g.fillCircle(c.x, c.y, 2);
    }

    g.setAlpha(0);
    this.tweens.add({ targets: g, alpha: 1, duration: 600, delay: 200 });
    this.cornerFlourishes = g;
  }

  /* ── Floating sparkle particles ── */
  private spawnSparkles(cx: number, cy: number, imgW: number, imgH: number) {
    // Clean up old sparkles
    for (const s of this.sparkles) s.destroy();
    for (const t of this.sparkleTweens) t.destroy();
    this.sparkles = [];
    this.sparkleTweens = [];

    const left = cx - imgW / 2 + 20;
    const right = cx + imgW / 2 - 20;
    const top = cy - imgH / 2 + 20;
    const bottom = cy + imgH / 2 - 20;

    for (let i = 0; i < 3; i++) {
      const sx = Phaser.Math.Between(left, right);
      const sy = Phaser.Math.Between(top, bottom);
      const sparkle = this.add.graphics();

      // Draw a tiny 4-pointed star
      sparkle.fillStyle(0xfff8dc, 0.7);
      sparkle.fillCircle(0, 0, 2);
      sparkle.fillRect(-4, -0.5, 8, 1);
      sparkle.fillRect(-0.5, -4, 1, 8);

      sparkle.setPosition(sx, sy);
      sparkle.setAlpha(0);
      sparkle.setScale(0.6);

      this.sparkles.push(sparkle);

      // Gentle floating animation with fade in/out loop
      const delay = i * 800;
      const tw = this.tweens.add({
        targets: sparkle,
        alpha: { from: 0, to: 0.6 },
        scale: { from: 0.5, to: 0.9 },
        y: sy - Phaser.Math.Between(15, 30),
        x: sx + Phaser.Math.Between(-10, 10),
        duration: 2400 + i * 400,
        delay,
        yoyo: true,
        repeat: -1,
        repeatDelay: 600 + i * 300,
        ease: "Sine.easeInOut",
      });
      this.sparkleTweens.push(tw);
    }
  }

  /* ── Progress dots as mini book-page icons ── */
  private createProgressDots(width: number, height: number) {
    const dotSpacing = 28;
    const totalWidth = (this.pages.length - 1) * dotSpacing;
    const startX = width / 2 - totalWidth / 2;
    const pageW = 10;
    const pageH = 13;

    for (let i = 0; i < this.pages.length; i++) {
      const container = this.add.container(startX + i * dotSpacing, height * 0.68);

      // Mini page icon (rounded rect)
      const pageIcon = this.add.graphics();
      pageIcon.fillStyle(0xd4a574, i === 0 ? 1 : 0.25);
      pageIcon.fillRoundedRect(-pageW / 2, -pageH / 2, pageW, pageH, 2);
      pageIcon.lineStyle(1, 0x8b6f47, i === 0 ? 0.6 : 0.15);
      pageIcon.strokeRoundedRect(-pageW / 2, -pageH / 2, pageW, pageH, 2);

      // Tiny "text lines" inside the page
      const lines = this.add.graphics();
      lines.fillStyle(0x8b6f47, i === 0 ? 0.35 : 0.1);
      lines.fillRect(-3, -3, 6, 1);
      lines.fillRect(-3, 0, 6, 1);
      lines.fillRect(-3, 3, 4, 1);

      container.add([pageIcon, lines]);

      // Warm glow for active page (circle behind the icon)
      const glow = this.add.graphics();
      glow.fillStyle(0xd4a574, 0);
      glow.fillCircle(0, 0, 11);
      container.addAt(glow, 0); // behind icon

      this.progressDots.push(container);
    }
  }

  private updateProgressDots(index: number) {
    const pageW = 10;
    const pageH = 13;

    this.progressDots.forEach((container, i) => {
      const isActive = i === index;
      const isPast = i < index;

      // Redraw the page icon with updated colors
      const pageIcon = container.getAt(1) as Phaser.GameObjects.Graphics;
      pageIcon.clear();
      pageIcon.fillStyle(0xd4a574, isActive || isPast ? 1 : 0.25);
      pageIcon.fillRoundedRect(-pageW / 2, -pageH / 2, pageW, pageH, 2);
      pageIcon.lineStyle(1, 0x8b6f47, isActive || isPast ? 0.6 : 0.15);
      pageIcon.strokeRoundedRect(-pageW / 2, -pageH / 2, pageW, pageH, 2);

      // Update text lines opacity
      const lines = container.getAt(2) as Phaser.GameObjects.Graphics;
      lines.clear();
      lines.fillStyle(0x8b6f47, isActive || isPast ? 0.35 : 0.1);
      lines.fillRect(-3, -3, 6, 1);
      lines.fillRect(-3, 0, 6, 1);
      lines.fillRect(-3, 3, 4, 1);

      // Warm glow on active
      const glow = container.getAt(0) as Phaser.GameObjects.Graphics;
      glow.clear();
      if (isActive) {
        glow.fillStyle(0xd4a574, 0.25);
        glow.fillCircle(0, 0, 11);
      }

      this.tweens.add({
        targets: container,
        scale: isActive ? 1.35 : 1,
        duration: 250,
        ease: "Sine.easeOut",
      });
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

  /* ── Button label with page numbers ── */
  private getButtonLabel(index: number): string {
    if (index === this.pages.length - 1) {
      return "Enter the world  \u2192";
    }
    return `Page ${index + 2} of ${this.pages.length}  \u2192`;
  }

  private showPage(index: number) {
    const page = this.pages[index];
    const { width, height } = this.scale;

    // Update progress
    this.updateProgressDots(index);

    // Page-turn flip-out: squish horizontally + slight rotation + shadow
    if (this.pageImage) {
      const oldImg = this.pageImage;
      oldImg.setOrigin(0.5, 0.5);

      // Shadow line that sweeps across during flip-out
      const imgW = oldImg.displayWidth;
      const imgH = oldImg.displayHeight;
      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.25);
      shadow.fillRect(-3, -imgH / 2, 6, imgH);
      shadow.setPosition(oldImg.x, oldImg.y);
      shadow.setAlpha(0);

      // Animate the shadow sweep from center to right edge
      this.tweens.add({
        targets: shadow,
        x: oldImg.x + imgW / 2,
        alpha: { from: 0.6, to: 0 },
        duration: 300,
        ease: "Sine.easeIn",
        onComplete: () => shadow.destroy(),
      });

      // Flip-out: scaleX 1 -> 0 with slight rotation
      this.tweens.add({
        targets: oldImg,
        scaleX: 0,
        angle: 6,
        duration: 300,
        ease: "Sine.easeIn",
        onComplete: () => oldImg.destroy(),
      });
      this.pageImage = undefined;
    }

    // Fade out old flourishes
    if (this.cornerFlourishes) {
      const oldFlourishes = this.cornerFlourishes;
      this.tweens.add({
        targets: oldFlourishes,
        alpha: 0,
        duration: 200,
        onComplete: () => oldFlourishes.destroy(),
      });
      this.cornerFlourishes = undefined;
    }

    if (this.textures.exists(page.imageKey)) {
      this.pageImage = this.add.image(width / 2, height * 0.35, page.imageKey);
      this.pageImage.setOrigin(0.5, 0.5);
      const targetW = width * 0.75;
      const targetH = height * 0.52;
      const scaleToFit = Math.max(targetW / this.pageImage.width, targetH / this.pageImage.height);
      const finalScale = scaleToFit;

      // Start with scaleX 0 for flip-in, scaleY at final, slight counter-rotation
      this.pageImage.setScale(0, finalScale);
      this.pageImage.setAngle(-6);
      this.pageImage.setAlpha(1);

      // Rounded mask for storybook illustrations
      const imgW = this.pageImage.width * finalScale;
      const imgH = this.pageImage.height * finalScale;
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
      this.tweens.add({ targets: imgShadow, alpha: 1, duration: 500, delay: 300 });

      // Flip-in: scaleX 0 -> finalScale with rotation unwinding, delayed to follow flip-out
      this.tweens.add({
        targets: this.pageImage,
        scaleX: finalScale,
        angle: 0,
        duration: 300,
        delay: 300,
        ease: "Sine.easeOut",
        onComplete: () => {
          // Draw corner flourishes after image settles
          this.drawCornerFlourishes(width / 2, height * 0.35, imgW, imgH);
          // Spawn floating sparkles
          this.spawnSparkles(width / 2, height * 0.35, imgW, imgH);

          // Sheen sweep: semi-transparent white strip moving left to right
          const sheen = this.add.graphics();
          sheen.fillStyle(0xffffff, 0.25);
          sheen.fillRect(-15, -imgH / 2, 30, imgH);
          sheen.setPosition(width / 2 - imgW / 2, height * 0.35);
          sheen.setAlpha(1);

          this.tweens.add({
            targets: sheen,
            x: width / 2 + imgW / 2,
            alpha: 0,
            duration: 400,
            ease: "Sine.easeOut",
            onComplete: () => sheen.destroy(),
          });
        },
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

      // Flourishes on placeholder too
      this.drawCornerFlourishes(
        width / 2,
        height * 0.1 + height * 0.55 / 2,
        width * 0.7,
        height * 0.55
      );
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

    // Update button label with page progress
    const btnText = this.nextButton.getAt(2) as Phaser.GameObjects.Text;
    btnText.setText(this.getButtonLabel(index));
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
