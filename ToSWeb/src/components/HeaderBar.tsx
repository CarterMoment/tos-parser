import React from "react";
import { Link } from "react-router-dom";
import { useDarkMode } from "../lib/useDarkMode";
import { useAuth } from "../contexts/AuthContext";

type Props = {
  onChoose: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
  analyzeDisabled: boolean;
  loading: boolean;
};

export default function HeaderBar({ onChoose, onAnalyze, analyzeDisabled, loading }: Props) {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { user, signOut } = useAuth();

  return (
    <header className="relative flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 w-full box-border">

      {/* Indeterminate loading bar */}
      {loading && (
        <div
          aria-hidden
          className="absolute left-0 right-0 top-0 h-0.5"
          style={{
            backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.4) 20%, #2563eb 50%, rgba(59,130,246,0.4) 80%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'termshift-indeterminate 1.2s linear infinite',
          }}
        />
      )}

      {/* Brand */}
      <div>
        <div className="text-xl font-bold text-gray-900 dark:text-white">Termshift</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Highlight risky clauses in any ToS</div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">

        <Link
          to="/history"
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          History
        </Link>

        <label className="cursor-pointer">
          <input type="file" accept=".txt,text/plain" onChange={onChoose} className="hidden" />
          <span className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition cursor-pointer inline-block">
            Choose File
          </span>
        </label>

        <button
          onClick={onAnalyze}
          disabled={analyzeDisabled || loading}
          className="px-4 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition inline-flex items-center gap-2"
          aria-busy={loading}
        >
          {loading ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" role="img" aria-label="Loading">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                <path d="M21 12a9 9 0 0 1-9 9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
                </path>
              </svg>
              Analyzing…
            </>
          ) : 'Analyze'}
        </button>

        <button
          onClick={toggleDarkMode}
          className="px-2.5 py-1.5 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? '🌙' : '☀️'}
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400 max-w-[160px] truncate">
            {user?.displayName ?? user?.email ?? ''}
          </span>
          <button
            onClick={() => signOut()}
            className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Sign out
          </button>
        </div>
      </div>

      <style>{`
        @keyframes termshift-indeterminate {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </header>
  );
}
