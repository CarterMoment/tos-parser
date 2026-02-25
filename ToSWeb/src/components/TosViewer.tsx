import { forwardRef, useMemo } from "react";
import type { Span } from "../types";
import { buildSegments } from "../lib/spans";

type Props = { 
  text: string; 
  spans: Span[]; 
  height?: number;
  onPasteText?: (t: string) => void;
};

const TosViewer = forwardRef<HTMLDivElement, Props>(({ text, spans, height = 600, onPasteText }, ref) => {

  const segments = useMemo(() => buildSegments(text, spans), [text, spans]);

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    if (!onPasteText) return;
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain");
    onPasteText(pasted);
  }

 return (
      <div style={{ display: "flex", flexDirection: "column", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, minHeight: 520 ,
            width: "100%", boxSizing: "border-box"}}>
        {text ? (
          <div
            ref={ref}
            onPaste={handlePaste}
            style={{
              flex: 1,
              minHeight: 0,
              maxHeight: height,
              overflow: "auto",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              width: "100%",
            }}
          >
            {segments.map((s) => (
              <span key={s.key} id={s.id} style={s.style}>
                {s.text}
              </span>
            ))}
          </div>
        ) : (
          <div
            onPaste={handlePaste}
            style={{ color: "#98a2b3" }}
          >
            You can paste a ToS document directly here or drop a .txt file.
          </div>
        )}
      </div>
    );
});

export default TosViewer;
