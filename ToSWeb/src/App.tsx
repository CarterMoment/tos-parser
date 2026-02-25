import { useMemo, useRef, useState } from "react";
import type { ApiResult, Span } from "./types";
import HeaderBar from "./components/HeaderBar";
import TosViewer from "./components/TosViewer";
import FlagsPanel, { type SpanWithDisplay } from "./components/FlagsPanel";
import { autoNormalizeSpans, wordIndexMap } from "./lib/spans";
//import { useDarkMode } from "./lib/useDarkMode";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  //const {isDarkMode, toggleDarkMode} = useDarkMode();

  const onChoose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const r = new FileReader();
      r.onload = () => setText(String(r.result ?? ""));
      r.readAsText(f);
    } else setText("");
  };

async function analyze() {
  // Must have *either* a file or pasted text
  if (!file && text.trim().length === 0) return;

  setLoading(true);
  setError(null);
  setResult(null);

  try {
    let res: Response;

    // --- CASE 1: File upload ---
    if (file) {
      const body = new FormData();
      body.append("file", file);

      res = await fetch(`${import.meta.env.VITE_API_URL}/v1/analyze-file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN ?? ""}` },
        body,
      });
    }

    // --- CASE 2: Raw text ---
    else {
      res = await fetch(`${import.meta.env.VITE_API_URL}/v1/analyze-raw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN ?? ""}`,
        },
        body: JSON.stringify({ text }),
      });
    }

    const ct = res.headers.get("content-type") || "";

    if (!res.ok) {
      const msg =
        ct.includes("application/json")
          ? JSON.stringify(await res.json())
          : await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${msg}`);
    }

    setResult(await res.json());
  } catch (e: any) {
    setError(e.message ?? String(e));
  } finally {
    setLoading(false);
  }
}

  async function ping() {
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL}/health`);
      console.log("Ping", r.status, await r.text());
    } catch (e) { console.error("Ping failed:", e); }
  }

  // Normalize spans (word -> char if needed) and build display ranges for the sidebar
  const { normalizedSpans, unit, sidebarSpans } = useMemo(() => {
    const spans: Span[] = result?.spans ?? [];
    const { normalized, unit } = autoNormalizeSpans(text, spans);

    let sidebarSpans: SpanWithDisplay[] = normalized.map(s => ({ ...s, _displayRange: `${s.start}–${s.end}` }));
    if (unit === "word") {
      const words = wordIndexMap(text);
      const toWordIdx = (charPos: number) => {
        let i = 0;
        while (i < words.count && words.starts[i] <= charPos) i++;
        return Math.max(0, i - 1);
      };
      sidebarSpans = normalized.map(s => {
        const wStart = toWordIdx(s.start);
        const wEnd = toWordIdx(Math.max(s.end - 1, s.start)) + 1; // exclusive
        return { ...s, _displayRange: `w${wStart}–w${wEnd}` };
      });
    }
    return { normalizedSpans: normalized, unit, sidebarSpans };
  }, [text, result]);

  const containerRef = useRef<HTMLDivElement>(null);
  function scrollToSpan(start: number, end: number) {
    const el = containerRef.current?.querySelector(`#r${start}-${end}`) as HTMLElement | null;
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.outline = "2px solid rgba(0,0,0,0.25)";
      setTimeout(() => (el.style.outline = "none"), 800);
    }
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" }}>
      <HeaderBar
        onPing={ping}
        onChoose={onChoose}
        onAnalyze={analyze}
        analyzeDisabled={(!file && text.trim().length === 0)}
        loading={loading}
      />

      <div
        style={{
          display: "grid",
          justifyItems: "stretch",
          // minmax(0, 1fr) prevents child overflow from collapsing columns
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 24,
          padding: 20,
          alignItems: "start",
          width: "100%",
          boxSizing: "border-box",
        }}
      >

        <TosViewer
          ref={containerRef}
          text={text}
          spans={normalizedSpans}
          onPasteText={(t) => {
            setFile(null);     // optional: clears previously uploaded file
            setText(t);
            setResult(null);   // optional: reset analysis results
          }}/>
        <FlagsPanel
          summary={result?.summary}
          unitLabel={unit === "word" ? "word" : "character"}
          spans={sidebarSpans}
          error={error}
          onJump={scrollToSpan}
        />
      </div>
    </div>
  );
}
