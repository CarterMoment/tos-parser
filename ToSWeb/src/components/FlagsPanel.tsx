import { useState } from "react";
import { Link } from "react-router-dom";
import type { Severity, Span } from "../types";
import { SEVERITY_BG, SEVERITY_TEXT } from "../lib/spans";
import { jsPDF } from "jspdf";

export type SpanWithDisplay = Span & { _displayRange: string };

type Props = {
  summary?: { risk_count?: number; highest_severity?: Severity | string };
  streaming?: boolean;
  unitLabel: "word" | "character";
  spans: SpanWithDisplay[];
  error?: string | null;
  onJump: (start: number, end: number, idx: number) => void;
  onReset?: () => void;
  height?: number;
};

const SEVERITY_BORDER: Record<string, string> = {
  HIGH: '#e11d48',
  MED: '#f59e0b',
  LOW: '#22c55e',
  CRITICAL: '#991b1b',
};

const SEVERITY_CARD_BG: Record<string, string> = {
  HIGH: '#fff1f2',
  CRITICAL: '#fef2f2',
};

const VERDICT_COLOR: Record<string, string> = {
  CRITICAL: '#991b1b',
  HIGH: '#e11d48',
  MED: '#f59e0b',
  LOW: '#16a34a',
};

const VERDICT_LABEL: Record<string, string> = {
  CRITICAL: 'Critical Risk',
  HIGH: 'High Risk',
  MED: 'Medium Risk',
  LOW: 'Low Risk',
};

function SeverityIcon({ severity }: { severity: string }) {
  const isHighRisk = severity === 'HIGH' || severity === 'CRITICAL';
  if (isHighRisk) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function FlagsPanel({
  summary,
  streaming = false,
  unitLabel,
  spans,
  error,
  onJump,
  onReset,
}: Props) {
  const [showPopup, setShowPopup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const getFlagsText = () => {
    if (!spans.length) return "No flags found.";
    return spans
      .map((s, i) => `${i + 1}. [${s.severity}] ${s.label} — ${s.explanation || "No explanation"}`)
      .join("\n");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getFlagsText());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadStub = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleSavePDF = async () => {
    try {
      setSaving(true);
      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const margin = 40;
      const lineHeight = 16;
      const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const lines = pdf.splitTextToSize(getFlagsText(), maxWidth);
      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(12);
      let y = margin;
      lines.forEach((line: string) => {
        if (y > pdf.internal.pageSize.getHeight() - margin) { pdf.addPage(); y = margin; }
        pdf.text(line, margin, y);
        y += lineHeight;
      });
      pdf.save("flags-summary.pdf");
    } catch (err) {
      console.error("Failed to save PDF:", err);
    } finally {
      setSaving(false);
    }
  };

  // Severity counts
  const counts = spans.reduce((acc, s) => {
    const key = String(s.severity).toUpperCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topSev = String(summary?.highest_severity ?? 'LOW').toUpperCase();
  const verdictColor = VERDICT_COLOR[topSev] ?? VERDICT_COLOR.LOW;
  const verdictLabel = VERDICT_LABEL[topSev] ?? 'Low Risk';

  const hasResult = !!summary;
  const isEmpty = !hasResult && !streaming;

  return (
    <div className="relative flex flex-col gap-0">

      {/* "Coming soon" toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm px-4 py-2.5 rounded-lg shadow-lg">
          Coming soon
        </div>
      )}

      {/* Empty state — shown before any scan */}
      {isEmpty && (
        <div className="relative">
          {/* Dimmed mock card */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 overflow-hidden opacity-50 blur-[1.5px] pointer-events-none bg-white dark:bg-gray-800 mb-3">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-600 rounded mb-3" />
            <div className="flex gap-4">
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded" />
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded" />
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded" />
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 overflow-hidden opacity-50 blur-[1.5px] pointer-events-none bg-white dark:bg-gray-800">
            <div className="h-3 w-48 bg-gray-200 dark:bg-gray-600 rounded mb-2" />
            <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded mb-1.5" />
            <div className="h-3 w-3/4 bg-gray-100 dark:bg-gray-700 rounded" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center bg-white/90 dark:bg-gray-800/90 rounded-xl px-6 py-4 shadow border border-gray-200 dark:border-gray-700">
              <p className="font-semibold text-gray-700 dark:text-gray-200">Run a scan to see results</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Paste text or choose a file to analyze</p>
            </div>
          </div>
        </div>
      )}

      {/* Verdict banner */}
      {hasResult && (
        <div
          className="rounded-xl p-4 mb-3 text-white"
          style={{ background: verdictColor }}
        >
          <div className="font-bold text-lg">
            {verdictLabel} — {summary!.risk_count ?? 0} issue{(summary!.risk_count ?? 0) !== 1 ? 's' : ''} found
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-sm opacity-90">
            {counts['CRITICAL'] > 0 && <span>● {counts['CRITICAL']} Critical</span>}
            {counts['HIGH'] > 0 && <span>● {counts['HIGH']} High</span>}
            {counts['MED'] > 0 && <span>● {counts['MED']} Medium</span>}
            {counts['LOW'] > 0 && <span>● {counts['LOW']} Low</span>}
            {spans.length === 0 && <span className="opacity-70">No detailed flags</span>}
          </div>
          <div className="text-xs opacity-60 mt-1.5">
            indices as {unitLabel}s
          </div>
        </div>
      )}

      {/* Streaming placeholder banner */}
      {!hasResult && streaming && (
        <div className="rounded-xl p-4 mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="font-semibold text-blue-700 dark:text-blue-300 text-sm">Scanning document…</div>
        </div>
      )}

      {/* Action bar */}
      {hasResult && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <button
            onClick={() => setShowPopup(true)}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Share
          </button>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            {copied ? "Copied!" : "Copy Results"}
          </button>
          <button
            onClick={handleDownloadStub}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            ↓ Download Report
          </button>
        </div>
      )}

      {/* Flag cards */}
      <div className="flex flex-col gap-3">
        {spans.map((s, i) => {
          const sev = String(s.severity).toUpperCase();
          const isHighRisk = sev === 'HIGH' || sev === 'CRITICAL';
          return (
            <div
              key={`${s.label}-${s.start}-${s.end}-${i}`}
              onClick={() => onJump(s.start, s.end, i)}
              className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
              style={{
                borderLeft: `4px solid ${SEVERITY_BORDER[sev] ?? SEVERITY_BORDER.LOW}`,
                background: isHighRisk ? SEVERITY_CARD_BG[sev] : undefined,
                animation: 'ts-fade-slide-in 0.35s ease both',
                animationDelay: `${i * 60}ms`,
              }}
            >
              <div className="flex items-start gap-2 mb-1.5">
                <span
                  style={{ color: SEVERITY_TEXT[s.severity] }}
                  className="mt-0.5"
                >
                  <SeverityIcon severity={sev} />
                </span>
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">{s.label}</div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full border font-medium ml-2 shrink-0"
                    style={{ background: SEVERITY_BG[s.severity], color: SEVERITY_TEXT[s.severity], borderColor: SEVERITY_TEXT[s.severity] + '33' }}
                  >
                    {s.severity}
                  </span>
                </div>
              </div>
              {s.explanation && (
                <div className="text-sm text-gray-600 dark:text-gray-400 ml-6">{s.explanation}</div>
              )}
            </div>
          );
        })}

        {!spans.length && streaming && (
          <div className="flex items-center justify-center gap-1.5 py-10 text-sm text-blue-500 dark:text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-bounce [animation-delay:300ms]" />
            <span className="ml-2">Analyzing risks…</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ts-fade-slide-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {error && (
        <div className="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mt-4 text-sm whitespace-pre-wrap">
          {error}
        </div>
      )}

      {/* Bottom of results */}
      {spans.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col items-center gap-3">
          {onReset && (
            <button
              onClick={onReset}
              className="w-full py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Analyze Another Document
            </button>
          )}
          <Link to="/history" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View History →
          </Link>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Upgrade to Pro for unlimited scans →
          </p>
        </div>
      )}

      {/* Share popup */}
      {showPopup && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowPopup(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-5 w-[90%] max-w-md shadow-2xl border border-gray-200 dark:border-gray-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="font-semibold text-lg text-gray-900 dark:text-white mb-3">Share Flags</div>
            <textarea
              value={getFlagsText()}
              readOnly
              className="w-full h-48 text-sm p-3 border border-gray-200 dark:border-gray-600 rounded-lg resize-none mb-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPopup(false)}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
              >
                Close
              </button>
              <button
                onClick={handleCopy}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={handleSavePDF}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white transition"
              >
                {saving ? "Saving…" : "Save as PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
