import * as Phaser from "phaser";
import { getStory, getAssets, isDemo } from "@/src/data/storyStore";
import { StoryBible } from "@/src/data/types";

export class ArenaScene extends Phaser.Scene {
  private story!: StoryBible;
  private protagonist!: Phaser.GameObjects.Image;
  private protagonistGlow!: Phaser.GameObjects.Graphics;
  private speechBubble!: Phaser.GameObjects.Container;
  private speechText!: Phaser.GameObjects.Text;
  private collectedIds: string[] = [];
  private objectSprites: Phaser.GameObjects.Image[] = [];
  private isThinking = false;
  private wrongAttempts = 0;
  private hintGlows: Phaser.GameObjects.Arc[] = [];
  private descriptionDismissTimer?: Phaser.Time.TimerEvent;
  private protagonistDropZone!: Phaser.GameObjects.Zone;
  private typewriterTimer?: Phaser.Time.TimerEvent;
  private hint?: Phaser.GameObjects.Text;
  private orbitSparkles: Phaser.GameObjects.Arc[] = [];
  private orbitAngles: number[] = [];
  private orbitSpeeds: number[] = [];
  private orbitRadii: number[] = [];
  private trayItems: Phaser.GameObjects.Arc[] = [];
  private trayCount = 0;

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

    const protagonistData = assets?.images.get("protagonist");
    if (protagonistData) {
      this.load.image("protagonist", protagonistData);
    } else if (demo) {
      this.load.image("protagonist", "/assets/images/mowgli.png");
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

    // Protagonist glow ring (base glow)
    this.protagonistGlow = this.add.graphics();
    this.drawGlowRing(width / 2, height * 0.35, 75);
    this.tweens.add({
      targets: this.protagonistGlow,
      alpha: { from: 0.35, to: 0.9 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Orbiting sparkle dots around protagonist
    const sparkleColors = [0xffd700, 0xffe44d, 0xffffff];
    const sparkleRadii = [80, 95, 110];
    const sparkleSpeeds = [0.015, -0.01, 0.02];
    for (let i = 0; i < 3; i++) {
      const dot = this.add.circle(width / 2, height * 0.35, 3, sparkleColors[i], 0.9);
      dot.setDepth(10);
      this.orbitSparkles.push(dot);
      this.orbitAngles.push((i * Math.PI * 2) / 3);
      this.orbitSpeeds.push(sparkleSpeeds[i]);
      this.orbitRadii.push(sparkleRadii[i]);
      // Pulsing size
      this.tweens.add({
        targets: dot,
        scale: { from: 0.8, to: 1.5 },
        alpha: { from: 0.6, to: 1 },
        duration: 800 + i * 200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    this.protagonist = this.createProtagonist(width / 2, height * 0.35);

    // Drop zone
    const dropZone = this.add.zone(width / 2, height * 0.35, 300, 300);
    dropZone.setRectangleDropZone(300, 300);
    this.protagonistDropZone = dropZone;

    // Gentle breathing animation
    this.tweens.add({
      targets: this.protagonist,
      scale: { from: this.protagonist.scale, to: this.protagonist.scale * 1.025 },
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

    this.createCollectedTray(width);
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
        if (dz === this.protagonistDropZone) {
          this.protagonist.setTint(0xffffaa);
          this.tweens.add({ targets: this.protagonist, scale: this.protagonist.scale * 1.08, duration: 150, ease: "Sine.easeOut" });
        }
      }
    );

    this.input.on(
      "dragleave",
      (_pointer: Phaser.Input.Pointer, _go: Phaser.GameObjects.Image, dz: Phaser.GameObjects.GameObject) => {
        if (dz === this.protagonistDropZone) {
          this.protagonist.clearTint();
          this.tweens.add({ targets: this.protagonist, scale: this.protagonist.getData("baseScale") || this.protagonist.scale, duration: 150 });
        }
      }
    );

    this.input.on(
      "drop",
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image, dz: Phaser.GameObjects.GameObject) => {
        if (dz === this.protagonistDropZone) {
          this.protagonist.clearTint();
          gameObject.setData("isDragging", false);
          this.handleDrop(gameObject);
        }
      }
    );

    this.input.on(
      "dragend",
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image, dropped: boolean) => {
        gameObject.setData("isDragging", false);

        const dist = Phaser.Math.Distance.Between(gameObject.x, gameObject.y, this.protagonist.x, this.protagonist.y);
        if (!dropped && dist < 200) {
          this.protagonist.clearTint();
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

  // Sync masks and orbiting sparkles every frame
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

    // Sync hint glows with sprite positions
    for (const sprite of this.objectSprites) {
      const glow = sprite.getData("hintGlow") as Phaser.GameObjects.Arc | undefined;
      if (glow) {
        glow.x = sprite.x;
        glow.y = sprite.y;
      }
    }

    // Update orbiting sparkles around protagonist
    const cx = this.protagonist.x;
    const cy = this.protagonist.y;
    for (let i = 0; i < this.orbitSparkles.length; i++) {
      this.orbitAngles[i] += this.orbitSpeeds[i];
      this.orbitSparkles[i].x = cx + Math.cos(this.orbitAngles[i]) * this.orbitRadii[i];
      this.orbitSparkles[i].y = cy + Math.sin(this.orbitAngles[i]) * this.orbitRadii[i];
    }
  }

  private drawGlowRing(x: number, y: number, radius: number) {
    this.protagonistGlow.clear();
    this.protagonistGlow.lineStyle(10, 0xffd700, 0.2);
    this.protagonistGlow.strokeCircle(x, y, radius + 14);
    this.protagonistGlow.lineStyle(5, 0xffd700, 0.5);
    this.protagonistGlow.strokeCircle(x, y, radius + 6);
    this.protagonistGlow.lineStyle(2, 0xffe44d, 0.8);
    this.protagonistGlow.strokeCircle(x, y, radius);
  }

  private createProtagonist(x: number, y: number): Phaser.GameObjects.Image {
    if (this.textures.exists("protagonist")) {
      const m = this.add.image(x, y, "protagonist");
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
    g.generateTexture("protagonist_placeholder", 80, 80);
    g.destroy();
    const m = this.add.image(x, y, "protagonist_placeholder");
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

      // Feature 5: Tap to see object description
      sprite.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        sprite.setData("tapStartX", pointer.x);
        sprite.setData("tapStartY", pointer.y);
      });
      sprite.on("pointerup", (pointer: Phaser.Input.Pointer) => {
        const tapStartX = sprite.getData("tapStartX") as number;
        const tapStartY = sprite.getData("tapStartY") as number;
        if (tapStartX === undefined || tapStartY === undefined) return;
        const dist = Phaser.Math.Distance.Between(tapStartX, tapStartY, pointer.x, pointer.y);
        if (dist < 5 && !this.isThinking) {
          const objDef = this.story.objects.find((o) => o.id === obj.id);
          if (objDef?.description) {
            // Clear any existing dismiss timer
            if (this.descriptionDismissTimer) {
              this.descriptionDismissTimer.destroy();
            }
            this.showMessage(objDef.description);
            this.descriptionDismissTimer = this.time.delayedCall(3000, () => {
              this.tweens.add({
                targets: this.speechBubble,
                alpha: 0,
                scale: 0.9,
                duration: 300,
                ease: "Sine.easeIn",
              });
              this.descriptionDismissTimer = undefined;
            });
          }
        }
      });

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

      // "Drag me" shimmer sparkle every 3-4 seconds
      this.time.addEvent({
        delay: 3000 + Math.random() * 1000,
        loop: true,
        callback: () => {
          if (!sprite.active || sprite.getData("isDragging")) return;
          const sparkle = this.add.circle(
            sprite.x + Phaser.Math.Between(-15, 15),
            sprite.y + Phaser.Math.Between(-15, 15),
            0,
            0xffd700,
            0.9
          );
          sparkle.setDepth(20);
          this.tweens.add({
            targets: sparkle,
            scale: { from: 0, to: 2.5 },
            alpha: { from: 0.9, to: 0 },
            duration: 600,
            ease: "Sine.easeOut",
            onComplete: () => sparkle.destroy(),
          });
        },
      });

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

    // Speech bubble tail pointing down to protagonist
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
    this.speechBubble.setScale(0.9);
  }

  private showMessageTypewriter(text: string) {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }
    this.speechText.setText("");

    this.tweens.add({
      targets: this.speechBubble,
      alpha: 1,
      scale: 1,
      y: 75,
      duration: 300,
      ease: "Back.easeOut",
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

    // Dismiss any description auto-dismiss timer
    if (this.descriptionDismissTimer) {
      this.descriptionDismissTimer.destroy();
      this.descriptionDismissTimer = undefined;
    }

    const id = sprite.getData("id") as string;
    this.safePlay("drop");

    // Protagonist reaction bounce
    this.tweens.add({
      targets: this.protagonist,
      scale: this.protagonist.scale * 1.08,
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

    const fallbackText = isCorrectSolution
      ? this.story.successMessage
      : (this.story.objects.find((o) => o.id === id)?.responseText ?? "...");

    const objectDef = this.story.objects.find((o) => o.id === id);
    const isCorrectObject = objectDef?.isCorrect ?? false;

    // --- Feature 1: Live AI responses for custom stories ---
    if (isDemo()) {
      // Demo mode: use pre-baked text + cached MP3
      this.showMessage(fallbackText);
      const audioFile = isCorrectSolution ? "success" : id;
      const audio = new Audio(`/assets/audio/responses/${audioFile}.mp3`);
      audio.play().catch(() => {});
      this.finalizeDrop(sprite, id, isCorrectSolution, isCorrectObject);
    } else {
      // Custom story: call API for dynamic response
      this.showMessage("...");
      fetch("/api/protagonist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectIds: this.collectedIds, storyBible: this.story }),
      })
        .then((res) => res.json())
        .then((data: { text?: string }) => {
          const responseText = data.text || fallbackText;
          this.showMessage(responseText);
          // --- Feature 3: TTS for custom story responses ---
          this.fetchAndPlayTTS(responseText);
        })
        .catch(() => {
          this.showMessage(fallbackText);
        })
        .finally(() => {
          this.finalizeDrop(sprite, id, isCorrectSolution, isCorrectObject);
        });
    }
  }

  /** Shared post-drop logic for both demo and custom modes */
  private finalizeDrop(
    sprite: Phaser.GameObjects.Image,
    id: string,
    isCorrectSolution: boolean,
    isCorrectObject: boolean
  ) {
    if (isCorrectSolution) {
      this.safePlay("celebration");
      this.celebrate();
    } else if (isCorrectObject) {
      const correctIndex = this.story.solution.indexOf(id);
      this.flyToProtagonist(sprite, correctIndex === 0 ? -60 : 60);
      sprite.disableInteractive();
      // Clean up any hint glow on this sprite
      this.removeHintGlow(sprite);
      this.isThinking = false;
    } else {
      // Wrong object — gentle shake then float back
      this.safePlay("hmm");
      this.wrongAttempts++;

      // Feature 4: Show hints after 2 wrong attempts
      if (this.wrongAttempts >= 2) {
        this.showHintGlows();
      }

      const shakeStartX = sprite.x;
      this.tweens.add({
        targets: sprite,
        x: shakeStartX + 5,
        duration: 50,
        yoyo: true,
        repeat: 5,
        ease: "Sine.easeInOut",
        onComplete: () => {
          sprite.x = shakeStartX;
          sprite.alpha = 1;

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
        },
      });
      this.collectedIds = this.collectedIds.filter((cid) => cid !== id);
      this.isThinking = false;
    }
  }

  /** Feature 3: Fetch TTS audio and play it (non-blocking, fire-and-forget) */
  private fetchAndPlayTTS(text: string) {
    fetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((res) => res.json())
      .then((data: { audioBase64?: string | null }) => {
        if (data.audioBase64) {
          const binary = atob(data.audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: "audio/mp3" });
          const audio = new Audio(URL.createObjectURL(blob));
          audio.play().catch(() => {});
        }
      })
      .catch(() => {
        // TTS is optional — fail silently
      });
  }

  /** Feature 4: Show golden glow behind correct (uncollected) objects */
  private showHintGlows() {
    // Only add glows for correct objects that haven't been collected yet
    for (const solutionId of this.story.solution) {
      if (this.collectedIds.includes(solutionId)) continue;
      const sprite = this.objectSprites.find((s) => s.getData("id") === solutionId);
      if (!sprite || sprite.getData("hintGlow")) continue;

      const glow = this.add.circle(sprite.x, sprite.y, 50, 0xffd700, 0.3);
      glow.setDepth(sprite.depth - 1);
      sprite.setData("hintGlow", glow);
      this.hintGlows.push(glow);

      this.tweens.add({
        targets: glow,
        alpha: { from: 0.3, to: 0.7 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  /** Remove a hint glow for a specific sprite (when collected) */
  private removeHintGlow(sprite: Phaser.GameObjects.Image) {
    const glow = sprite.getData("hintGlow") as Phaser.GameObjects.Arc | undefined;
    if (glow) {
      this.tweens.killTweensOf(glow);
      glow.destroy();
      sprite.setData("hintGlow", null);
      this.hintGlows = this.hintGlows.filter((g) => g !== glow);
    }
  }

  private flyToProtagonist(sprite: Phaser.GameObjects.Image, offsetX: number) {
    const targetX = this.protagonist.x + offsetX;
    const targetY = this.protagonist.y + 40;

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
      onComplete: () => {
        trailInterval.destroy();
        this.addToCollectedTray(sprite);
      },
    });
  }

  private celebrate() {
    const { width, height } = this.scale;

    // Hide glow
    this.tweens.add({ targets: this.protagonistGlow, alpha: 0, duration: 300 });

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

    // Protagonist jump + celebrate
    this.tweens.add({
      targets: this.protagonist,
      y: this.protagonist.y - 50,
      duration: 350,
      yoyo: true,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: this.protagonist,
          angle: { from: -12, to: 12 },
          duration: 180,
          yoyo: true,
          repeat: 4,
          ease: "Sine.easeInOut",
          onComplete: () => {
            this.protagonist.setAngle(0);
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

      // Play Again button
      const btnBg = this.add.graphics();
      const btnW = 200;
      const btnH = 50;
      const btnX = width / 2 - btnW / 2;
      const btnY = height / 2 + 80;
      btnBg.fillStyle(0xffd700, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 14);
      btnBg.lineStyle(2, 0x6b4423, 0.6);
      btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 14);

      const btnText = this.add
        .text(width / 2, btnY + btnH / 2, "Play Again", {
          fontSize: "22px",
          color: "#2c2c2a",
          fontFamily: "Nunito, sans-serif",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      // Invisible interactive zone for the button (starts disabled, enabled after fade-in)
      const btnZone = this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH);
      btnZone.on("pointerover", () => {
        btnBg.clear();
        btnBg.fillStyle(0xffe44d, 1);
        btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 14);
        btnBg.lineStyle(2, 0x6b4423, 0.6);
        btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 14);
      });
      btnZone.on("pointerout", () => {
        btnBg.clear();
        btnBg.fillStyle(0xffd700, 1);
        btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 14);
        btnBg.lineStyle(2, 0x6b4423, 0.6);
        btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 14);
      });
      btnZone.on("pointerdown", () => {
        this.scene.start("TitleScene");
      });

      // Feature 6: Victory stars above the title
      const starTexts: Phaser.GameObjects.Text[] = [];
      const starY = height / 2 - 80;
      const starSpacing = 60;
      const starStartX = width / 2 - starSpacing;
      for (let i = 0; i < 3; i++) {
        const star = this.add
          .text(starStartX + i * starSpacing, starY, "\u2605", {
            fontSize: "40px",
            color: "#ffd700",
            fontFamily: "Nunito, sans-serif",
            stroke: "#6b4423",
            strokeThickness: 2,
          })
          .setOrigin(0.5);
        star.setScale(0);
        star.alpha = 0;
        starTexts.push(star);
      }

      overlay.alpha = 0;
      victoryText.alpha = 0;
      subtitleText.alpha = 0;
      btnBg.alpha = 0;
      btnText.alpha = 0;

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

      // Pop in stars staggered after title appears
      starTexts.forEach((star, i) => {
        this.tweens.add({
          targets: star,
          alpha: 1,
          scale: { from: 0, to: 1.2 },
          duration: 350,
          delay: 500 + i * 300,
          ease: "Back.easeOut",
          onComplete: () => {
            // Settle to scale 1
            this.tweens.add({
              targets: star,
              scale: 1,
              duration: 150,
              ease: "Sine.easeOut",
              onComplete: () => {
                // Gentle rotation wobble
                this.tweens.add({
                  targets: star,
                  angle: { from: -8, to: 8 },
                  duration: 600,
                  yoyo: true,
                  repeat: -1,
                  ease: "Sine.easeInOut",
                });
              },
            });
          },
        });
      });

      this.tweens.add({
        targets: subtitleText,
        alpha: 1,
        duration: 600,
        delay: 500,
        ease: "Sine.easeOut",
      });
      this.tweens.add({
        targets: [btnBg, btnText],
        alpha: 1,
        duration: 600,
        delay: 800,
        ease: "Sine.easeOut",
        onComplete: () => {
          btnZone.setInteractive({ useHandCursor: true });
        },
      });
    });
  }

  private createCollectedTray(_width: number) {
    // Tray area lives at top-right; items added dynamically
    this.trayItems = [];
    this.trayCount = 0;
  }

  private addToCollectedTray(sprite: Phaser.GameObjects.Image) {
    const { width } = this.scale;
    const trayX = width - 50 - this.trayCount * 40;
    const trayY = 20;

    // Determine color from object's palette hash
    const id = sprite.getData("id") as string;
    const palette = [0xd4a574, 0x7cb342, 0x5c9ece, 0xe57373, 0xffd54f, 0xba68c8];
    const hash = id.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
    const color = palette[hash % palette.length];

    const dot = this.add.circle(trayX, trayY, 0, color, 0.9);
    dot.setStrokeStyle(2, 0xffffff, 0.8);
    dot.setDepth(30);

    this.tweens.add({
      targets: dot,
      radius: 15,
      scale: { from: 0, to: 1 },
      duration: 400,
      ease: "Back.easeOut",
    });

    this.trayItems.push(dot);
    this.trayCount++;
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
