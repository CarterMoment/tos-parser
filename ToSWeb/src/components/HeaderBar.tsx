import React from "react";
import { useDarkMode } from "../lib/useDarkMode";

type Props = {
  onPing: () => void;
  onChoose: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
  analyzeDisabled: boolean;
  /** NEW: pass loading from parent while analysis is running */
  loading: boolean;
};

export default function HeaderBar({ onPing, onChoose, onAnalyze, analyzeDisabled, loading }: Props) {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // colors that work in both themes
  const border = "var(--border-color)";
  const bgPrimary = "var(--bg-primary)";
  const cardBg = "var(--card-bg)";
  const textPrimary = "var(--text-primary)";
  const textSecondary = "var(--text-secondary)";

  return (
    <div style={{
      position: "relative",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 20px",
      borderBottom: `1px solid ${border}`,
      width: "100%",
      boxSizing: "border-box",
      backgroundColor: bgPrimary
    }}>
      {/* Top indeterminate loading bar */}
      {loading && (
        <div aria-hidden
             style={{
               position: "absolute",
               left: 0,
               right: 0,
               top: 0,
               height: 3,
               backgroundImage: `linear-gradient(90deg,
                 transparent 0%,
                 rgba(0,0,0,0.15) 20%,
                 rgba(0,0,0,0.35) 50%,
                 rgba(0,0,0,0.15) 80%,
                 transparent 100%)`,
               backgroundSize: "200% 100%",
               animation: "gertly-indeterminate 1.2s linear infinite"
             }}
        />
      )}

      <div>
        <h1 style={{ margin: 0, color: textPrimary }}>Gertly</h1>
        <div style={{ color: textSecondary }}>Upload a ToS and we’ll highlight risky clauses.</div>
      </div>

      <div>
        <button onClick={onPing} style={{ padding: "8px 10px", marginRight: 8 }}>Health Check</button>

        <label style={{ marginRight: 8 }}>
          <input type="file" accept=".txt,text/plain" onChange={onChoose} style={{ display: "none" }} />
          <span style={{
            padding: "8px 10px",
            border: `1px solid ${border}`,
            borderRadius: 6,
            cursor: "pointer",
            display: "inline-block",
            backgroundColor: cardBg,
            color: textPrimary
          }}>
            Choose File
          </span>
        </label>

        <button
          onClick={onAnalyze}
          disabled={analyzeDisabled || loading}
          style={{ padding: "8px 12px", borderRadius: 6, minWidth: 92, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          aria-busy={loading}
          aria-live="polite"
        >
          {loading ? (
            <>
              {/* SVG spinner (no external CSS needed) */}
              <svg width="16" height="16" viewBox="0 0 24 24" role="img" aria-label="Loading">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
                <path d="M21 12a9 9 0 0 1-9 9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
                </path>
              </svg>
              Analyzing…
            </>
          ) : (
            "Analyze"
          )}
        </button>

        <button
          onClick={toggleDarkMode}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: "1.2rem",
            cursor: "pointer",
            border: `1px solid ${border}`,
            backgroundColor: cardBg,
            marginLeft: 8
          }}
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? '🌙' : '☀️'}
        </button>
      </div>

      {/* Local keyframes for the indeterminate bar */}
      <style>
        {`
          @keyframes gertly-indeterminate {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}
      </style>
    </div>
  );
}
