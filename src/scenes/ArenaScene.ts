import * as Phaser from "phaser";
import { getStory, getAssets, isDemo } from "@/src/data/storyStore";
import { StoryBible } from "@/src/data/types";

export class ArenaScene extends Phaser.Scene {
  private story!: StoryBible;
  private mowgli!: Phaser.GameObjects.Image;
  private mowgliGlow!: Phaser.GameObjects.Graphics;
  private speechBubble!: Phaser.GameObjects.Container;
  private speechText!: Phaser.GameObjects.Text;
  private collectedIds: string[] = [];
  private objectSprites: Phaser.GameObjects.Image[] = [];
  private isThinking = false;
  private mowgliDropZone!: Phaser.GameObjects.Zone;
  private typewriterTimer?: Phaser.Time.TimerEvent;
  private hint?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "ArenaScene" });
  }

  preload() {
    this.story = getStory();
    const assets = getAssets();
    const demo = isDemo();

    const bgData = assets?.images.get("background");
    if (bgData) {
      this.load.image("background", bgData);
    } else if (demo) {
      this.load.image("background", "/assets/images/cold-lairs-bg.png");
    }

    const protagonistData = assets?.images.get("mowgli");
    if (protagonistData) {
      this.load.image("mowgli", protagonistData);
    } else if (demo) {
      this.load.image("mowgli", "/assets/images/mowgli.png");
    }

    this.story.objects.forEach((obj) => {
      const objData = assets?.images.get(obj.id);
      if (objData) {
        this.load.image(obj.id, objData);
      } else if (demo) {
        this.load.image(obj.id, `/assets/images/${obj.id}.png`);
      }
    });

    this.load.audio("pickup", "/assets/audio/pickup.wav");
    this.load.audio("drop", "/assets/audio/drop.wav");
    this.load.audio("celebration", "/assets/audio/celebration.wav");
    this.load.audio("hmm", "/assets/audio/hmm.wav");

    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.warn(`Asset failed to load: ${file.key}. Using placeholder.`);
    });
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.fadeIn(800, 0, 0, 0);

    // Background
    if (this.textures.exists("background")) {
      const bg = this.add.image(width / 2, height / 2, "background");
      bg.setScale(Math.max(width / bg.width, height / bg.height));
    } else {
      this.cameras.main.setBackgroundColor("#1a3a2e");
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
          alpha: { from: 0.15, to: 0.6 },
          duration: Phaser.Math.Between(2000, 4000),
          yoyo: true,
          repeat: -1,
        });
      }
    }

    // Dark overlay at bottom for object readability
    const bottomGrad = this.add.graphics();
    bottomGrad.fillGradientStyle(0x1a3a2e, 0x1a3a2e, 0x1a3a2e, 0x1a3a2e, 0, 0, 0.7, 0.7);
    bottomGrad.fillRect(0, height * 0.55, width, height * 0.45);

    // Mowgli glow ring
    this.mowgliGlow = this.add.graphics();
    this.drawGlowRing(width / 2, height * 0.35, 75);
    this.tweens.add({
      targets: this.mowgliGlow,
      alpha: { from: 0.35, to: 0.9 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.mowgli = this.createMowgli(width / 2, height * 0.35);

    // Drop zone
    const dropZone = this.add.zone(width / 2, height * 0.35, 300, 300);
    dropZone.setRectangleDropZone(300, 300);
    this.mowgliDropZone = dropZone;

    // Gentle breathing on Mowgli
    this.tweens.add({
      targets: this.mowgli,
      scale: { from: this.mowgli.scale, to: this.mowgli.scale * 1.025 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.createSpeechBubble();
    this.showMessageTypewriter(this.story.greeting);

    // Play greeting audio from assets or demo file
    const assets = getAssets();
    const greetingAudio = assets?.audio.get("greeting");
    if (greetingAudio) {
      const binary = atob(greetingAudio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "audio/mp3" });
      const audio = new Audio(URL.createObjectURL(blob));
      audio.play().catch(() => {});
    } else if (isDemo()) {
      const audio = new Audio("/assets/audio/responses/greeting.mp3");
      audio.play().catch(() => {});
    }


    // Instruction hint — fades out after 5s instead of pulsing forever
    this.hint = this.add
      .text(width / 2, height * 0.56, `Drag an object to ${this.story.protagonist.name} to help!`, {
        fontSize: "18px",
        color: "#fdf6e3",
        fontFamily: "Nunito, sans-serif",
        fontStyle: "bold",
        backgroundColor: "#1a3a2ecc",
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5);

    // Fade out hint after 5 seconds
    this.time.delayedCall(5000, () => {
      if (this.hint) {
        this.tweens.add({
          targets: this.hint,
          alpha: 0,
          y: this.hint.y - 10,
          duration: 600,
          ease: "Sine.easeIn",
          onComplete: () => this.hint?.destroy(),
        });
      }
    });

    this.placeObjects(width, height);
    this.setupDragHandlers();
  }

  private setupDragHandlers() {
    this.input.on(
      "drag",
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
        gameObject.x = dragX;
        gameObject.y = dragY;
      }
    );

    this.input.on(
      "dragstart",
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
        // Dismiss hint on first drag
        if (this.hint?.alpha === 1) {
          this.tweens.add({ targets: this.hint, alpha: 0, duration: 200, onComplete: () => this.hint?.destroy() });
        }

        const bobTween = gameObject.getData("bobTween") as Phaser.Tweens.Tween;
        if (bobTween) bobTween.stop();
        this.children.bringToTop(gameObject);

        // Add drop shadow effect while dragging
        gameObject.setData("isDragging", true);

        this.tweens.add({
          targets: gameObject,
          scale: gameObject.getData("baseScale") * 1.2,
          duration: 200,
          ease: "Back.easeOut",
        });
        this.safePlay("pickup");
      }
    );

    this.input.on(
      "dragenter",
      (_pointer: Phaser.Input.Pointer, _go: Phaser.GameObjects.Image, dz: Phaser.GameObjects.GameObject) => {
        if (dz === this.mowgliDropZone) {
          this.mowgli.setTint(0xffffaa);
          this.tweens.add({ targets: this.mowgli, scale: this.mowgli.scale * 1.08, duration: 150, ease: "Sine.easeOut" });
        }
      }
    );

    this.input.on(
      "dragleave",
      (_pointer: Phaser.Input.Pointer, _go: Phaser.GameObjects.Image, dz: Phaser.GameObjects.GameObject) => {
        if (dz === this.mowgliDropZone) {
          this.mowgli.clearTint();
          this.tweens.add({ targets: this.mowgli, scale: this.mowgli.getData("baseScale") || this.mowgli.scale, duration: 150 });
        }
      }
    );

    this.input.on(
      "drop",
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image, dz: Phaser.GameObjects.GameObject) => {
        if (dz === this.mowgliDropZone) {
          this.mowgli.clearTint();
          gameObject.setData("isDragging", false);
          this.handleDrop(gameObject);
        }
      }
    );

    this.input.on(
      "dragend",
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image, dropped: boolean) => {
        gameObject.setData("isDragging", false);

        const dist = Phaser.Math.Distance.Between(gameObject.x, gameObject.y, this.mowgli.x, this.mowgli.y);
        if (!dropped && dist < 200) {
          this.mowgli.clearTint();
          this.handleDrop(gameObject);
          return;
        }

        if (!dropped) {
          const startY = gameObject.getData("startY") as number;
          this.tweens.add({
            targets: gameObject,
            x: gameObject.getData("startX"),
            y: startY,
            scale: gameObject.getData("baseScale"),
            duration: 350,
            ease: "Cubic.easeOut",
            onComplete: () => {
              const newBob = this.tweens.add({
                targets: gameObject,
                y: startY - 6,
                duration: 1800 + Math.random() * 400,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut",
              });
              gameObject.setData("bobTween", newBob);
            },
          });
        }
      }
    );
  }

  // Sync masks every frame
  update() {
    for (const sprite of this.objectSprites) {
      const maskGfx = sprite.getData("maskGfx") as Phaser.GameObjects.Graphics | undefined;
      const maskRadius = sprite.getData("maskRadius") as number | undefined;
      if (maskGfx && maskRadius) {
        maskGfx.clear();
        maskGfx.fillStyle(0xffffff);
        maskGfx.fillCircle(sprite.x, sprite.y, maskRadius);
      }
    }
  }

  private drawGlowRing(x: number, y: number, radius: number) {
    this.mowgliGlow.clear();
    this.mowgliGlow.lineStyle(10, 0xffd700, 0.2);
    this.mowgliGlow.strokeCircle(x, y, radius + 14);
    this.mowgliGlow.lineStyle(5, 0xffd700, 0.5);
    this.mowgliGlow.strokeCircle(x, y, radius + 6);
    this.mowgliGlow.lineStyle(2, 0xffe44d, 0.8);
    this.mowgliGlow.strokeCircle(x, y, radius);
  }

  private createMowgli(x: number, y: number): Phaser.GameObjects.Image {
    if (this.textures.exists("mowgli")) {
      const m = this.add.image(x, y, "mowgli");
      const baseScale = 120 / Math.max(m.width, m.height);
      m.setScale(baseScale);
      m.setData("baseScale", baseScale);

      // Circular mask
      const displaySize = 120;
      const maskShape = this.add.graphics().setVisible(false);
      maskShape.fillStyle(0xffffff);
      maskShape.fillCircle(x, y, displaySize / 2);
      m.setMask(maskShape.createGeometryMask());

      // Label with rounded bg
      this.add
        .text(x, y + 72, this.story.protagonist.name, {
          fontSize: "15px",
          color: "#fdf6e3",
          fontFamily: "Nunito, sans-serif",
          fontStyle: "bold",
          backgroundColor: "#1a3a2ecc",
          padding: { x: 10, y: 4 },
        })
        .setOrigin(0.5);
      return m;
    }
    // Placeholder
    const g = this.add.graphics();
    g.fillStyle(0xd4a574, 1);
    g.fillCircle(0, 0, 40);
    g.lineStyle(3, 0x6b4423);
    g.strokeCircle(0, 0, 40);
    g.generateTexture("mowgli_placeholder", 80, 80);
    g.destroy();
    const m = this.add.image(x, y, "mowgli_placeholder");
    m.setData("baseScale", 1);
    this.add
      .text(x, y + 50, this.story.protagonist.name, { fontSize: "15px", color: "#fdf6e3", fontFamily: "Nunito, sans-serif", fontStyle: "bold" })
      .setOrigin(0.5);
    return m;
  }

  private createObject(id: string, name: string, x: number, y: number): Phaser.GameObjects.Image {
    if (this.textures.exists(id)) {
      const sprite = this.add.image(x, y, id);
      const baseScale = 85 / Math.max(sprite.width, sprite.height);
      sprite.setScale(baseScale);
      sprite.setData("baseScale", baseScale);

      // Circular mask
      const displayW = sprite.displayWidth;
      const displayH = sprite.displayHeight;
      const maskRadius = Math.min(displayW, displayH) / 2;
      const maskShape = this.add.graphics().setVisible(false);
      maskShape.fillStyle(0xffffff);
      maskShape.fillCircle(x, y, maskRadius);
      sprite.setMask(maskShape.createGeometryMask());
      sprite.setData("maskGfx", maskShape);
      sprite.setData("maskRadius", maskRadius);

      // Label — larger, more readable
      this.add
        .text(x, y + 52, name, {
          fontSize: "14px",
          color: "#fdf6e3",
          fontFamily: "Nunito, sans-serif",
          fontStyle: "bold",
          backgroundColor: "#1a3a2ecc",
          padding: { x: 8, y: 3 },
        })
        .setOrigin(0.5);
      return sprite;
    }
    // Styled placeholder with distinct color per object
    const palette = [0xd4a574, 0x7cb342, 0x5c9ece, 0xe57373, 0xffd54f, 0xba68c8];
    const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const color = palette[hash % palette.length];
    const size = 80;
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(size / 2, size / 2, size / 2);
    g.lineStyle(3, 0xffffff, 0.6);
    g.strokeCircle(size / 2, size / 2, size / 2 - 2);
    g.generateTexture(`${id}_placeholder`, size, size);
    g.destroy();

    // Add initial letter on top
    const sprite = this.add.image(x, y, `${id}_placeholder`);
    sprite.setData("baseScale", 1);
    this.add
      .text(x, y, name.charAt(0).toUpperCase(), {
        fontSize: "28px",
        color: "#ffffff",
        fontFamily: "Nunito, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(x, y + 50, name, {
        fontSize: "13px",
        color: "#fdf6e3",
        backgroundColor: "#1a3a2ecc",
        padding: { x: 8, y: 4 },
        fontFamily: "Nunito, sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    return sprite;
  }

  private placeObjects(width: number, height: number) {
    const positions = [
      { x: width * 0.15, y: height * 0.72 },
      { x: width * 0.35, y: height * 0.84 },
      { x: width * 0.5, y: height * 0.73 },
      { x: width * 0.65, y: height * 0.84 },
      { x: width * 0.85, y: height * 0.72 },
    ];

    this.story.objects.forEach((obj, i) => {
      const pos = positions[i % positions.length];
      const sprite = this.createObject(obj.id, obj.name, pos.x, pos.y);
      sprite.setData("id", obj.id);
      sprite.setData("startX", pos.x);
      sprite.setData("startY", pos.y);
      sprite.setInteractive({ draggable: true, useHandCursor: true });

      // Hover glow — smooth tween instead of instant
      sprite.on("pointerover", () => {
        if (!this.isThinking) {
          sprite.setTint(0xffffdd);
          this.tweens.add({
            targets: sprite,
            scale: sprite.getData("baseScale") * 1.12,
            duration: 200,
            ease: "Sine.easeOut",
          });
        }
      });
      sprite.on("pointerout", () => {
        if (!sprite.getData("isDragging")) {
          sprite.clearTint();
          this.tweens.add({
            targets: sprite,
            scale: sprite.getData("baseScale"),
            duration: 200,
            ease: "Sine.easeOut",
          });
        }
      });

      // Gentle bob (reduced amplitude 8 → 6px)
      const bobTween = this.tweens.add({
        targets: sprite,
        y: pos.y - 6,
        duration: 1800 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      sprite.setData("bobTween", bobTween);
      this.objectSprites.push(sprite);
    });
  }

  private createSpeechBubble() {
    const { width } = this.scale;
    const bubbleWidth = Math.min(480, width * 0.82);
    const bubbleX = width / 2;
    const bubbleY = 75;

    const bg = this.add.graphics();
    // Shadow
    bg.fillStyle(0x000000, 0.1);
    bg.fillRoundedRect(-bubbleWidth / 2 + 3, -46, bubbleWidth, 96, 18);
    // Main bubble
    bg.fillStyle(0xffffff, 0.95);
    bg.lineStyle(2, 0x6b4423, 0.5);
    bg.fillRoundedRect(-bubbleWidth / 2, -48, bubbleWidth, 96, 18);
    bg.strokeRoundedRect(-bubbleWidth / 2, -48, bubbleWidth, 96, 18);

    // Speech bubble tail (triangle pointing down to Mowgli)
    bg.fillStyle(0xffffff, 0.95);
    bg.fillTriangle(-12, 48, 12, 48, 0, 64);
    bg.lineStyle(2, 0x6b4423, 0.5);
    bg.lineBetween(-12, 48, 0, 64);
    bg.lineBetween(0, 64, 12, 48);

    this.speechText = this.add
      .text(0, 0, "", {
        fontSize: "17px",
        color: "#2c2c2a",
        fontFamily: "Nunito, sans-serif",
        align: "center",
        wordWrap: { width: bubbleWidth - 40 },
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    this.speechBubble = this.add.container(bubbleX, bubbleY, [bg, this.speechText]);
    this.speechBubble.setAlpha(0);
  }

  private showMessageTypewriter(text: string) {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }
    this.speechText.setText("");

    this.tweens.add({
      targets: this.speechBubble,
      alpha: 1,
      y: 75,
      duration: 350,
      ease: "Cubic.easeOut",
    });

    const chars = text.split("");
    const charDelay = 28;
    let index = 0;

    this.typewriterTimer = this.time.addEvent({
      delay: charDelay,
      repeat: chars.length - 1,
      callback: () => {
        index++;
        this.speechText.setText(text.substring(0, index));
      },
    });
  }

  private showMessage(text: string) {
    this.showMessageTypewriter(text);
  }

  private handleDrop(sprite: Phaser.GameObjects.Image) {
    if (this.isThinking) return;
    this.isThinking = true;

    const id = sprite.getData("id") as string;
    this.safePlay("drop");

    // Mowgli reaction bounce
    this.tweens.add({
      targets: this.mowgli,
      scale: this.mowgli.scale * 1.08,
      duration: 120,
      yoyo: true,
      ease: "Sine.easeOut",
    });

    this.tweens.add({
      targets: sprite,
      scale: sprite.getData("baseScale") * 0.8,
      alpha: 0.6,
      duration: 200,
    });

    if (!this.collectedIds.includes(id)) {
      this.collectedIds.push(id);
    }

    const isCorrectSolution = this.story.solution.every((s) =>
      this.collectedIds.includes(s)
    );

    const responseText = isCorrectSolution
      ? this.story.successMessage
      : (this.story.objects.find((o) => o.id === id)?.responseText ?? "...");

    this.showMessage(responseText);

    if (isDemo()) {
      const audioFile = isCorrectSolution ? "success" : id;
      const audio = new Audio(`/assets/audio/responses/${audioFile}.mp3`);
      audio.play().catch(() => {});
    }

    const objectDef = this.story.objects.find((o) => o.id === id);
    const isCorrectObject = objectDef?.isCorrect ?? false;

    if (isCorrectSolution) {
      this.safePlay("celebration");
      this.celebrate();
    } else if (isCorrectObject) {
      const correctIndex = this.story.solution.indexOf(id);
      this.flyToMowgli(sprite, correctIndex === 0 ? -60 : 60);
      sprite.disableInteractive();
      this.isThinking = false;
    } else {
      // Wrong object — red flash feedback then snap back
      this.safePlay("hmm");
      this.cameras.main.flash(200, 180, 60, 60, false, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress >= 1) this.cameras.main.resetFX();
      });

      const startY = sprite.getData("startY") as number;
      this.tweens.add({
        targets: sprite,
        x: sprite.getData("startX"),
        y: startY,
        scale: sprite.getData("baseScale"),
        alpha: 1,
        duration: 500,
        ease: "Cubic.easeOut",
        onComplete: () => {
          const newBob = this.tweens.add({
            targets: sprite,
            y: startY - 6,
            duration: 1800 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
          sprite.setData("bobTween", newBob);
        },
      });
      this.collectedIds = this.collectedIds.filter((cid) => cid !== id);
      this.isThinking = false;
    }
  }

  private flyToMowgli(sprite: Phaser.GameObjects.Image, offsetX: number) {
    const targetX = this.mowgli.x + offsetX;
    const targetY = this.mowgli.y + 40;

    // Sparkle trail
    const trailInterval = this.time.addEvent({
      delay: 35,
      repeat: 14,
      callback: () => {
        const sparkle = this.add.circle(
          sprite.x + Phaser.Math.Between(-6, 6),
          sprite.y + Phaser.Math.Between(-6, 6),
          Phaser.Math.Between(2, 5),
          0xffd700,
          0.8
        );
        this.tweens.add({
          targets: sparkle,
          alpha: 0,
          scale: 0,
          duration: 350,
          onComplete: () => sparkle.destroy(),
        });
      },
    });

    this.tweens.add({
      targets: sprite,
      x: targetX,
      y: targetY,
      scale: sprite.getData("baseScale") * 0.55,
      alpha: 0.35,
      duration: 500,
      ease: "Cubic.easeIn",
      onComplete: () => trailInterval.destroy(),
    });
  }

  private celebrate() {
    const { width, height } = this.scale;

    // Hide glow
    this.tweens.add({ targets: this.mowgliGlow, alpha: 0, duration: 300 });

    // Burst particles — varied sizes + colors
    const burstColors = [0xffd700, 0xff6b6b, 0x48dbfb, 0xff9ff3, 0x54a0ff, 0xfeca57, 0x2ecc71];
    for (let i = 0; i < 60; i++) {
      const color = burstColors[Phaser.Math.Between(0, burstColors.length - 1)];
      const size = Phaser.Math.Between(3, 8);
      const isRect = Math.random() > 0.5;
      const particle = isRect
        ? this.add.rectangle(width / 2, height * 0.35, size, size * 0.6, color)
        : this.add.circle(width / 2, height * 0.35, size / 2, color);

      if (isRect) (particle as Phaser.GameObjects.Rectangle).setAngle(Phaser.Math.Between(0, 360));

      this.tweens.add({
        targets: particle,
        x: width / 2 + Phaser.Math.Between(-450, 450),
        y: height * 0.35 + Phaser.Math.Between(-350, 250),
        alpha: { from: 1, to: 0 },
        scale: { from: 1.5, to: 0 },
        angle: (particle as any).angle + Phaser.Math.Between(90, 360),
        duration: Phaser.Math.Between(1200, 2200),
        ease: "Cubic.easeOut",
        delay: Phaser.Math.Between(0, 400),
        onComplete: () => particle.destroy(),
      });
    }

    // Confetti rain
    for (let i = 0; i < 50; i++) {
      const color = burstColors[Phaser.Math.Between(0, burstColors.length - 1)];
      const confetti = this.add.rectangle(
        Phaser.Math.Between(0, width),
        -Phaser.Math.Between(10, 60),
        Phaser.Math.Between(6, 14),
        Phaser.Math.Between(4, 8),
        color
      );
      confetti.setAngle(Phaser.Math.Between(0, 360));
      this.tweens.add({
        targets: confetti,
        y: height + 50,
        x: confetti.x + Phaser.Math.Between(-100, 100),
        angle: confetti.angle + Phaser.Math.Between(180, 720),
        alpha: { from: 1, to: 0.2 },
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 1000),
        ease: "Sine.easeIn",
        onComplete: () => confetti.destroy(),
      });
    }

    // Mowgli jump + celebrate
    this.tweens.add({
      targets: this.mowgli,
      y: this.mowgli.y - 50,
      duration: 350,
      yoyo: true,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: this.mowgli,
          angle: { from: -12, to: 12 },
          duration: 180,
          yoyo: true,
          repeat: 4,
          ease: "Sine.easeInOut",
          onComplete: () => {
            this.mowgli.setAngle(0);
          },
        });
      },
    });

    // Screen shake
    this.cameras.main.shake(500, 0.012);

    this.isThinking = true;
    this.objectSprites.forEach((s) => s.disableInteractive());

    // Victory overlay
    this.time.delayedCall(3000, () => {
      const overlay = this.add.graphics();
      overlay.fillStyle(0x000000, 0.65);
      overlay.fillRect(0, 0, width, height);

      const victoryText = this.add
        .text(width / 2, height / 2 - 10, this.story.victoryTitle, {
          fontSize: "58px",
          color: "#fdf6e3",
          fontFamily: "Nunito, sans-serif",
          fontStyle: "bold",
          stroke: "#6b4423",
          strokeThickness: 4,
        })
        .setOrigin(0.5);

      const subtitleText = this.add
        .text(width / 2, height / 2 + 40, this.story.victorySubtitle, {
          fontSize: "20px",
          color: "#d4a574",
          fontFamily: "Nunito, sans-serif",
        })
        .setOrigin(0.5);

      overlay.alpha = 0;
      victoryText.alpha = 0;
      subtitleText.alpha = 0;

      this.tweens.add({
        targets: overlay,
        alpha: 1,
        duration: 500,
        ease: "Sine.easeOut",
      });
      this.tweens.add({
        targets: victoryText,
        alpha: 1,
        y: height / 2 - 20,
        duration: 600,
        delay: 200,
        ease: "Cubic.easeOut",
      });
      this.tweens.add({
        targets: subtitleText,
        alpha: 1,
        duration: 600,
        delay: 500,
        ease: "Sine.easeOut",
      });
    });
  }

  private safePlay(key: string) {
    if (this.cache.audio.exists(key)) {
      try {
        this.sound.play(key, { volume: key === "celebration" ? 0.3 : 0.5 });
      } catch {
        // Audio context may not be unlocked
      }
    }
  }
}
