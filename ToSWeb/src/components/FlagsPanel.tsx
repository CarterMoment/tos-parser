//import React from "react";
import type { Severity, Span } from "../types";
import { SEVERITY_BG, SEVERITY_TEXT } from "../lib/spans";
import { useState } from "react";
import { jsPDF } from "jspdf";

export type SpanWithDisplay = Span & { _displayRange: string };

type Props = {
  summary?: { risk_count?: number; highest_severity?: Severity | string };
  unitLabel: "word" | "character";
  spans: SpanWithDisplay[];
  error?: string | null;
  onJump: (start: number, end: number) => void;
  height?: number;
};

export default function FlagsPanel({ summary, unitLabel, spans, error, onJump, height = 600 }: Props) {
  const [showPopup, setShowPopup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const getFlagsText = () => {
    if (!spans.length) return "No flags found.";

    return spans
      .map(
        (s, i) =>
          `${i + 1}. [${s.severity}] ${s.label} — ${
            s.explanation || "No explanation"
          } (range: ${s._displayRange})`
      )
      .join("\n");
  };

  const handleCopy = async () => {
    const text = getFlagsText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    console.log("Copied flags to clipboard!");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSavePDF = async () => {
        try {
      setSaving(true);
      const text = getFlagsText();
      const pdf = new jsPDF({
        orientation: "p",
        unit: "pt",
        format: "a4",
      });

      const margin = 40;
      const lineHeight = 16;
      const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;

      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(12);

      let y = margin;
      lines.forEach((line: string) => {
        if (y > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          y = margin;
        }
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

  return (
    <div style={{ maxHeight: height, overflow: "auto" }}>
      <div style={{ position: "relative", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Summary</div>
        {summary ? (
          <div>
              {/* Share Button */}
            <button
              onClick={() => setShowPopup(true)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                padding: "4px 8px",
                fontSize: 14,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#f3f4f6")}
            >
              Share
            </button>


            <div>Risks: <b>{summary.risk_count ?? 0}</b></div>
            <div>Highest severity: <b>{String(summary.highest_severity ?? "—")}</b></div>
            <div style={{ color: "#98a2b3", fontSize: 12, marginTop: 4 }}>
              indices interpreted as <b>{unitLabel}</b>
            </div>
          </div>
        ) : (
          <div style={{ color: "#98a2b3" }}>Run an analysis to see a summary.</div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {spans.map((s, i) => (
          <div key={`${s.label}-${s.start}-${s.end}-${i}`}
               onClick={() => onJump(s.start, s.end)}
               style={{
                 border: "1px solid #e5e7eb",
                 borderRadius: 12,
                 padding: 14,
                 cursor: "pointer",
                 transition: "box-shadow .15s ease",
               }}
               onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)")}
               onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontWeight: 600 }}>{s.label}</div>
              <span style={{
                fontSize: 12, padding: "2px 8px", borderRadius: 999,
                background: SEVERITY_BG[s.severity], color: SEVERITY_TEXT[s.severity],
                border: `1px solid ${SEVERITY_TEXT[s.severity]}22`
              }}>
                {s.severity}
              </span>
            </div>
            {s.explanation && <div style={{ color: "#475467", fontSize: 14 }}>{s.explanation}</div>}
            <div style={{ color: "#98a2b3", fontSize: 12, marginTop: 6 }}>
              range: { (s as any)._displayRange }
            </div>
          </div>
        ))}
        {!spans.length && <div style={{ color: "#98a2b3", textAlign: "center" }}>Flags will appear here after analysis.</div>}
      </div>

      {error && (
        <div style={{ color: "#b42318", background: "#fee4e2", border: "1px solid #fecdca",
                      borderRadius: 8, padding: 12, marginTop: 16, whiteSpace: "pre-wrap" }}>
          {error}
        </div>
      )}

      {/* Popup Modal */}
      {showPopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowPopup(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: 12,
              padding: 20,
              width: "90%",
              maxWidth: 420,
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{ fontWeight: 600, fontSize: 18, marginBottom: 12 }}
            >
              Share Flags
            </div>
            <textarea
              value={getFlagsText()}
              readOnly
              style={{
                width: "100%",
                height: 200,
                fontSize: 13,
                padding: 8,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                resize: "none",
                marginBottom: 12,
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setShowPopup(false)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#f3f4f6",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <button
                onClick={handleCopy}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={handleSavePDF}
                disabled={saving}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: saving ? "#9ca3af" : "#16a34a",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                {saving ? "Saving..." : "Save as PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
