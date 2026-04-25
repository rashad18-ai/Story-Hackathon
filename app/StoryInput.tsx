"use client";

import { useState, useRef } from "react";
import { StoryBible, GeneratedAssets } from "@/src/data/types";

interface StoryInputProps {
  onStoryReady: (bible: StoryBible, assets: GeneratedAssets | null) => void;
  onPlayDemo: () => void;
}

const STEPS = [
  "Reading PDF pages...",
  "Extracting illustrations...",
  "Parsing story with AI...",
  "Generating game objects...",
  "Generating narration...",
  "Launching game...",
];

export default function StoryInput({ onStoryReady, onPlayDemo }: StoryInputProps) {
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadPdfjsFromCdn(): Promise<any> {
    if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        const lib = (window as any).pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          resolve(lib);
        } else {
          reject(new Error("pdfjsLib not found"));
        }
      };
      script.onerror = () => reject(new Error("Failed to load PDF.js"));
      document.head.appendChild(script);
    });
  }

  async function extractPdfContent(
    arrayBuffer: ArrayBuffer
  ): Promise<{ text: string; pageTexts: string[]; pageImages: string[] }> {
    const pdfjsLib = await loadPdfjsFromCdn();
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

    const pageTexts: string[] = [];
    const pageImages: string[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);

      // Extract text
      const content = await page.getTextContent();
      const strings = content.items
        .filter((item: any) => "str" in item)
        .map((item: any) => item.str);
      pageTexts.push(strings.join(" "));

      // Render page to canvas, then crop to illustration area (top ~65%)
      const scale = 2;
      const viewport = page.getViewport({ scale });
      const fullCanvas = document.createElement("canvas");
      fullCanvas.width = viewport.width;
      fullCanvas.height = viewport.height;
      const fullCtx = fullCanvas.getContext("2d")!;

      await page.render({ canvasContext: fullCtx, viewport }).promise;

      // Crop to top portion (illustration area — skip text at bottom)
      const cropHeight = Math.floor(viewport.height * 0.42);
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = viewport.width;
      cropCanvas.height = cropHeight;
      const cropCtx = cropCanvas.getContext("2d")!;
      cropCtx.drawImage(
        fullCanvas,
        0, 0, viewport.width, cropHeight,
        0, 0, viewport.width, cropHeight
      );

      const dataUrl = cropCanvas.toDataURL("image/jpeg", 0.85);
      pageImages.push(dataUrl);
    }

    return {
      text: pageTexts.join("\n").trim(),
      pageTexts,
      pageImages,
    };
  }

  async function generateObjectImages(
    bible: StoryBible,
    assets: GeneratedAssets
  ) {
    const requests = bible.objects.map((obj) => ({
      id: obj.id,
      prompt: obj.imagePrompt || `${obj.name}, ${obj.description}`,
    }));

    // Also generate protagonist portrait if not already in assets
    if (!assets.images.has("mowgli")) {
      requests.push({
        id: "mowgli",
        prompt: bible.protagonist.imagePrompt || `${bible.protagonist.name}, ${bible.protagonist.description}, portrait`,
      });
    }

    try {
      const res = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
      });

      if (res.ok) {
        const { images } = await res.json();
        for (const [id, dataUrl] of Object.entries(images)) {
          assets.images.set(id, dataUrl as string);
        }
      }
    } catch {
      // Image generation is optional — game works with placeholders
    }
  }

  async function generateNarration(
    bible: StoryBible,
    assets: GeneratedAssets
  ) {
    const promises = bible.pages.map(async (page) => {
      try {
        const res = await fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: page.text }),
        });
        if (res.ok) {
          const { audioBase64 } = await res.json();
          if (audioBase64) {
            assets.audio.set(page.audioKey, audioBase64);
          }
        }
      } catch {
        // TTS is optional — game works without it
      }
    });

    // Also generate greeting audio
    promises.push(
      (async () => {
        try {
          const res = await fetch("/api/voice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: bible.greeting }),
          });
          if (res.ok) {
            const { audioBase64 } = await res.json();
            if (audioBase64) {
              assets.audio.set("greeting", audioBase64);
            }
          }
        } catch {}
      })()
    );

    await Promise.all(promises);
  }

  function buildAssets(
    bible: StoryBible,
    pageImages: string[]
  ): GeneratedAssets {
    const images = new Map<string, string>();

    // Use sourcePageIndex from Claude to map the correct PDF image to each game page
    bible.pages.forEach((page, i) => {
      const pdfIndex = page.sourcePageIndex;
      if (pdfIndex !== undefined && pdfIndex >= 1 && pdfIndex <= pageImages.length) {
        images.set(page.imageKey, pageImages[pdfIndex - 1]);
      } else {
        // Fallback: skip cover (0) and end page, map sequentially
        const fallbackIndex = i + 1;
        if (fallbackIndex < pageImages.length) {
          images.set(page.imageKey, pageImages[fallbackIndex]);
        }
      }
    });

    // Use an early story page image as arena background
    const bgIndex = bible.pages[0]?.sourcePageIndex;
    if (bgIndex && bgIndex >= 1 && bgIndex <= pageImages.length) {
      images.set("background", pageImages[bgIndex - 1]);
    } else if (pageImages.length > 1) {
      images.set("background", pageImages[1]);
    }

    // Protagonist image — use a mid-story page where character is likely featured
    const midIndex = bible.pages[1]?.sourcePageIndex;
    if (midIndex && midIndex >= 1 && midIndex <= pageImages.length) {
      images.set("mowgli", pageImages[midIndex - 1]);
    } else if (pageImages.length > 2) {
      images.set("mowgli", pageImages[2]);
    }

    return { images, audio: new Map() };
  }

  async function handleFileUpload(file: File) {
    setLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      let text: string;
      let pageTexts: string[] = [];
      let pageImages: string[] = [];

      if (file.type === "application/pdf") {
        setStep(0);
        const arrayBuffer = await file.arrayBuffer();
        const result = await extractPdfContent(arrayBuffer);
        text = result.text;
        pageTexts = result.pageTexts;
        pageImages = result.pageImages;
        if (!text) throw new Error("Could not extract text from PDF");
        setStep(1);
      } else {
        text = await file.text();
        if (!text.trim()) throw new Error("File is empty");
        setStep(1);
      }

      // Clean per-page texts for Claude (strip Artory boilerplate)
      const cleanedPageTexts = pageTexts.map((t) =>
        t.replace(/ARTORY\.AI/gi, "").replace(/A personalized story for.*$/gi, "").replace(/Age \d+-\d+/gi, "").trim()
      ).filter((t) => t.length > 10);

      // Parse story with Claude
      setStep(2);
      const res = await fetch("/api/parse-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          cleanedPageTexts.length > 0
            ? { pageTexts: cleanedPageTexts }
            : { storyText: text.substring(0, 4000) }
        ),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to parse story");
      }

      const { storyBible } = await res.json();

      // Build assets from extracted PDF images using sourcePageIndex
      const assets = pageImages.length > 0 ? buildAssets(storyBible, pageImages) : {
        images: new Map<string, string>(),
        audio: new Map<string, string>(),
      };

      // Generate object + protagonist images with Ideogram
      setStep(3);
      await generateObjectImages(storyBible, assets);

      // Generate TTS narration for each page
      setStep(4);
      await generateNarration(storyBible, assets);

      setStep(5);
      onStoryReady(storyBible, assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
      setStep(-1);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a3a2e",
        fontFamily: "Nunito, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 600,
          width: "90%",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          alignItems: "center",
        }}
      >
        <h1
          style={{
            fontSize: 48,
            color: "#fdf6e3",
            margin: 0,
            textAlign: "center",
          }}
        >
          Story Royale
        </h1>
        <p
          style={{
            fontSize: 18,
            color: "#d4a574",
            margin: 0,
            textAlign: "center",
          }}
        >
          Upload a story and we'll build an interactive game from it
        </p>

        {/* Upload zone */}
        {!loading && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{
              width: "100%",
              padding: "40px 20px",
              borderRadius: 16,
              border: "2px dashed #d4a574",
              background: "#fdf6e310",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            <div style={{ fontSize: 42 }}>{"\uD83D\uDCC4"}</div>
            <p style={{ color: "#fdf6e3", fontSize: 18, margin: 0, textAlign: "center" }}>
              Drop a story PDF here or click to upload
            </p>
            <p style={{ color: "#8b6f47", fontSize: 13, margin: 0 }}>
              Supports PDF and text files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.text"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </div>
        )}

        {/* Progress display */}
        {loading && (
          <div
            style={{
              width: "100%",
              padding: "32px 24px",
              borderRadius: 16,
              border: "2px solid #d4a574",
              background: "#fdf6e310",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <p style={{ color: "#fdf6e3", fontSize: 16, margin: 0, textAlign: "center" }}>
              {fileName}
            </p>

            {/* Progress bar */}
            <div style={{
              width: "100%",
              height: 6,
              borderRadius: 3,
              background: "#fdf6e320",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${Math.max(10, ((step + 1) / STEPS.length) * 100)}%`,
                height: "100%",
                borderRadius: 3,
                background: "#d4a574",
                transition: "width 0.5s ease",
              }} />
            </div>

            {/* Step indicators */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {STEPS.map((label, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    opacity: i <= step ? 1 : 0.3,
                    transition: "opacity 0.3s",
                  }}
                >
                  <span style={{ fontSize: 16 }}>
                    {i < step ? "\u2705" : i === step ? "\u23F3" : "\u25CB"}
                  </span>
                  <span style={{
                    color: i <= step ? "#fdf6e3" : "#8b6f47",
                    fontSize: 14,
                  }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: "#ff6b6b", margin: 0, fontSize: 14 }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={onPlayDemo}
            disabled={loading}
            style={{
              padding: "14px 32px",
              borderRadius: 30,
              border: "2px solid #d4a574",
              background: "transparent",
              color: "#d4a574",
              fontSize: 18,
              fontWeight: "bold",
              fontFamily: "Nunito, sans-serif",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              opacity: loading ? 0.4 : 1,
            }}
          >
            Play Demo
          </button>
        </div>
      </div>
    </div>
  );
}
