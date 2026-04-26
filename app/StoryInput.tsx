"use client";

import { useState, useRef, useEffect } from "react";
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

/* ---- SVG upload icon ---- */
function UploadIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <rect
        x="6"
        y="10"
        width="36"
        height="30"
        rx="4"
        stroke="#d4a574"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M24 32V18"
        stroke="#d4a574"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M17 24l7-7 7 7"
        stroke="#d4a574"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 40h20"
        stroke="#d4a574"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---- Step indicator circle ---- */
function StepCircle({ state }: { state: "done" | "active" | "pending" }) {
  if (state === "done") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#4ade80",
          flexShrink: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6.5L5 9L9.5 3.5"
            stroke="#1a3a2e"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        className="step-pulse"
        style={{
          display: "inline-block",
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#f59e0b",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <span
      style={{
        display: "inline-block",
        width: 20,
        height: 20,
        borderRadius: "50%",
        border: "2px solid #8b6f47",
        background: "transparent",
        flexShrink: 0,
      }}
    />
  );
}

export default function StoryInput({ onStoryReady, onPlayDemo }: StoryInputProps) {
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const [uploadHover, setUploadHover] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [demoHover, setDemoHover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger subtitle fade-in on mount
  useEffect(() => {
    const t = setTimeout(() => setSubtitleVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

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
    if (!assets.images.has("protagonist")) {
      requests.push({
        id: "protagonist",
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
      images.set("protagonist", pageImages[midIndex - 1]);
    } else if (pageImages.length > 2) {
      images.set("protagonist", pageImages[2]);
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
    setUploadHover(false);
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
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Injected styles for font import, animations, and hover states */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600&family=Nunito:wght@400;700&display=swap');

        @keyframes bgShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(30px,-20px) scale(1.1);} }
        @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(-20px,30px) scale(1.15);} }
        @keyframes float3 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(15px,25px) scale(0.9);} }

        @keyframes stepPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%     { opacity: 0.5; transform: scale(0.85); }
        }
        .step-pulse {
          animation: stepPulse 1.4s ease-in-out infinite;
        }

        @keyframes subtitleFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}} />

      {/* Animated background layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 20% 30%, #2a5e4a 0%, transparent 60%), " +
            "radial-gradient(ellipse 60% 50% at 80% 70%, #3d2e1e 0%, transparent 55%), " +
            "radial-gradient(ellipse 90% 80% at 50% 50%, #1a3a2e 0%, #0f2a1f 100%)",
          backgroundSize: "200% 200%",
          animation: "bgShift 12s ease-in-out infinite",
          zIndex: 0,
        }}
      />

      {/* Floating dots for depth */}
      {[
        { top: "12%", left: "10%", size: 120, opacity: 0.06, anim: "float1 8s ease-in-out infinite" },
        { top: "60%", left: "75%", size: 90, opacity: 0.05, anim: "float2 10s ease-in-out infinite" },
        { top: "30%", left: "55%", size: 160, opacity: 0.04, anim: "float3 14s ease-in-out infinite" },
        { top: "75%", left: "20%", size: 70, opacity: 0.07, anim: "float1 11s ease-in-out infinite" },
        { top: "15%", left: "80%", size: 100, opacity: 0.05, anim: "float2 9s ease-in-out infinite" },
      ].map((dot, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            borderRadius: "50%",
            background: "#d4a574",
            opacity: dot.opacity,
            animation: dot.anim,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
      ))}

      <div
        style={{
          maxWidth: 600,
          width: "90%",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Title with Fredoka font */}
        <h1
          style={{
            fontSize: 48,
            color: "#fdf6e3",
            margin: 0,
            textAlign: "center",
            fontFamily: "'Fredoka', Nunito, sans-serif",
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          Story Royale
        </h1>

        {/* Subtitle with delayed fade-in */}
        <p
          style={{
            fontSize: 18,
            color: "#d4a574",
            margin: 0,
            textAlign: "center",
            opacity: subtitleVisible ? 1 : 0,
            transform: subtitleVisible ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          Upload a story and we&apos;ll build an interactive game from it
        </p>

        {/* Upload zone */}
        {!loading && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setUploadHover(true); }}
            onDragLeave={() => setUploadHover(false)}
            onDrop={handleDrop}
            onMouseEnter={() => setUploadHover(true)}
            onMouseLeave={() => setUploadHover(false)}
            style={{
              width: "100%",
              padding: "40px 20px",
              borderRadius: 16,
              border: uploadHover
                ? "2px dashed #f0c88a"
                : "2px dashed #d4a574",
              background: uploadHover
                ? "rgba(253,246,227,0.12)"
                : "rgba(253,246,227,0.04)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              transition: "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
              boxShadow: uploadHover
                ? "0 0 24px rgba(212,165,116,0.15)"
                : "none",
            }}
          >
            <UploadIcon />
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
              background: "rgba(253,246,227,0.04)",
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
              background: "rgba(253,246,227,0.12)",
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

            {/* Step indicators with styled circles */}
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
                  <StepCircle
                    state={i < step ? "done" : i === step ? "active" : "pending"}
                  />
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
            onMouseEnter={() => setDemoHover(true)}
            onMouseLeave={() => setDemoHover(false)}
            style={{
              padding: "14px 32px",
              borderRadius: 30,
              border: "none",
              background: demoHover && !loading
                ? "linear-gradient(135deg, #e8a84c, #d4a574)"
                : "linear-gradient(135deg, #d4a574, #c08a50)",
              color: "#1a3a2e",
              fontSize: 18,
              fontWeight: "bold",
              fontFamily: "Nunito, sans-serif",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.25s ease",
              opacity: loading ? 0.4 : 1,
              boxShadow: demoHover && !loading
                ? "0 6px 20px rgba(212,165,116,0.4)"
                : "0 2px 8px rgba(212,165,116,0.2)",
              transform: demoHover && !loading ? "translateY(-1px)" : "translateY(0)",
            }}
          >
            Play Demo
          </button>
        </div>
      </div>
    </div>
  );
}
