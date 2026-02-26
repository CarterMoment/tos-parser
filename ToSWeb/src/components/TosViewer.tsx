import { forwardRef, useMemo } from "react";
import type { Span } from "../types";
import { buildSegments } from "../lib/spans";

type Props = {
  text: string;
  spans: Span[];
  height?: number;
  onPasteText?: (t: string) => void;
};

const TosViewer = forwardRef<HTMLDivElement, Props>(({ text, spans, onPasteText }, ref) => {
  const segments = useMemo(() => buildSegments(text, spans), [text, spans]);

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    if (!onPasteText) return;
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain");
    onPasteText(pasted);
  }

  return (
    <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-xl p-4 w-full box-border bg-white dark:bg-gray-800 flex-1 min-h-0 overflow-hidden">
      {text ? (
        <div
          ref={ref}
          onPaste={handlePaste}
          className="flex-1 min-h-0 overflow-auto leading-relaxed whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200"
        >
          {segments.map((s) => (
            <span key={s.key} id={s.id} style={s.style}>
              {s.text}
            </span>
          ))}
        </div>
      ) : (
        <div onPaste={handlePaste} className="text-gray-400 dark:text-gray-500 text-sm">
          Paste a ToS document directly here, or drop a .txt file.
        </div>
      )}
    </div>
  );
});

export default TosViewer;
