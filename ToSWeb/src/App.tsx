import { useMemo, useRef, useState } from "react";
import type { ApiResult, Span } from "./types";
import TosViewer from "./components/TosViewer";
import FlagsPanel, { type SpanWithDisplay } from "./components/FlagsPanel";
import AppLayout from "./components/AppLayout";
import { autoNormalizeSpans, wordIndexMap } from "./lib/spans";
import { useAuth } from "./contexts/AuthContext";

const SAMPLE_TOS = `Terms of Service — Example App

Last updated: January 1, 2025

1. ARBITRATION CLAUSE
By using this service you agree to resolve all disputes through binding arbitration and waive your right to a jury trial or class action lawsuit. Arbitration will be conducted under AAA rules at our sole discretion.

2. DATA COLLECTION
We collect your location data, contacts, browsing history, and device identifiers. This data may be shared with third-party advertising partners without further notice to you.

3. AUTO-RENEWAL
Your subscription automatically renews at the then-current price unless cancelled at least 30 days before the renewal date. We may change pricing at any time with 7 days' notice.

4. CONTENT LICENSE
You grant us a perpetual, irrevocable, worldwide, royalty-free license to use, modify, publish, and sublicense any content you post, even after account deletion.

5. LIMITATION OF LIABILITY
In no event shall we be liable for any indirect, incidental, or consequential damages. Our total liability shall not exceed $10 regardless of the nature of the claim.

6. GOVERNING LAW
These terms are governed by the laws of Delaware. You consent to exclusive jurisdiction in Delaware courts.`;

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamSummary, setStreamSummary] = useState<ApiResult["summary"] | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSpanIdx, setActiveSpanIdx] = useState<number | null>(null);
  const { getIdToken } = useAuth();

  const onChoose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const r = new FileReader();
      r.onload = () => setText(String(r.result ?? ""));
      r.readAsText(f);
    } else setText("");
  };

  function loadExample() {
    setFile(null);
    setText(SAMPLE_TOS);
    setResult(null);
    setStreamSummary(null);
    setError(null);
    setActiveSpanIdx(null);
  }

  function handleReset() {
    setFile(null);
    setText("");
    setResult(null);
    setStreamSummary(null);
    setError(null);
    setActiveSpanIdx(null);
  }

  async function analyze() {
    if (!file && text.trim().length === 0) return;

    setLoading(true);
    setStreaming(false);
    setError(null);
    setResult(null);
    setStreamSummary(null);
    setActiveSpanIdx(null);

    try {
      const idToken = await getIdToken();
      const apiUrl = import.meta.env.VITE_API_URL;

      if (file) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch(`${apiUrl}/v1/analyze-file`, {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
          body,
        });
        if (!res.ok) {
          console.error(`File analysis failed (${res.status} ${res.statusText}):`, await res.text());
          throw new Error("Analysis failed. Please try again.");
        }
        setResult(await res.json());
        return;
      }

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      };
      const jsonBody = JSON.stringify({ text });

      let fullResolved = false;
      fetch(`${apiUrl}/v1/analyze-summary`, { method: "POST", headers, body: jsonBody })
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (data && !fullResolved) {
            setStreamSummary(data);
            setStreaming(true);
          }
        })
        .catch(e => { console.error('Preview unavailable:', e); setStreaming(false); });

      const res = await fetch(`${apiUrl}/v1/analyze`, {
        method: "POST",
        headers,
        body: jsonBody,
      });

      fullResolved = true;

      if (!res.ok) {
        const ct = res.headers.get("content-type") ?? "";
        const msg = ct.includes("application/json")
          ? JSON.stringify(await res.json())
          : await res.text();
        console.error(`Analysis failed (${res.status} ${res.statusText}):`, msg);
        throw new Error("Could not complete analysis. Please check your input and try again.");
      }

      setResult(await res.json());
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }

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
        const wEnd = toWordIdx(Math.max(s.end - 1, s.start)) + 1;
        return { ...s, _displayRange: `w${wStart}–w${wEnd}` };
      });
    }
    return { normalizedSpans: normalized, unit, sidebarSpans };
  }, [text, result]);

  const containerRef = useRef<HTMLDivElement>(null);
  function scrollToSpan(start: number, end: number, idx?: number) {
    if (idx !== undefined) setActiveSpanIdx(idx);
    const el = containerRef.current?.querySelector(`#r${start}-${end}`) as HTMLElement | null;
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.outline = "2px solid rgba(0,0,0,0.25)";
      setTimeout(() => (el.style.outline = "none"), 800);
    }
  }

  return (
    <AppLayout>
      <div className="grid grid-cols-2 gap-6 p-5 h-full overflow-hidden">

        {/* Left panel — text viewer */}
        <div className="flex flex-col overflow-hidden h-full">

          {/* Controls strip */}
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {file ? file.name : "Choose file"}
              <input type="file" accept=".txt,.pdf,.docx" onChange={onChoose} className="hidden" />
            </label>

            <button
              onClick={analyze}
              disabled={loading || (!file && text.trim().length === 0)}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition"
            >
              {loading ? "Analyzing…" : "Analyze"}
            </button>

            <button
              onClick={loadExample}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline ml-auto"
            >
              Try an example →
            </button>
          </div>

          {/* Active clause indicator */}
          {activeSpanIdx !== null && (
            <div className="flex items-center gap-2 mb-2 text-sm text-blue-600 dark:text-blue-400 shrink-0">
              <span>Clause {activeSpanIdx + 1} of {sidebarSpans.length} highlighted</span>
              <button
                onClick={() => setActiveSpanIdx(null)}
                className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              >
                ✕ Clear
              </button>
            </div>
          )}

          {/* Loading progress bar */}
          {loading && <div className="indeterminate-bar shrink-0" />}

          <TosViewer
            ref={containerRef}
            text={text}
            spans={normalizedSpans}
            onPasteText={(t) => {
              setFile(null);
              setText(t);
              setResult(null);
            }}
          />
        </div>

        {/* Right panel — flags */}
        <div className="overflow-auto h-full">
          <FlagsPanel
            summary={result?.summary ?? streamSummary ?? undefined}
            streaming={streaming}
            unitLabel={unit === "word" ? "word" : "character"}
            spans={sidebarSpans}
            error={error}
            onJump={(start, end, idx) => scrollToSpan(start, end, idx)}
            onReset={handleReset}
          />
        </div>

      </div>
    </AppLayout>
  );
}
