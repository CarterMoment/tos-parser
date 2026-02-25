import type { Severity, Span } from "../types";

export const SEVERITY_BG: Record<Severity, string> = {
  HIGH: "#ffe1e1",
  MED: "#fff2cc",
  LOW:  "#e6f8e8",
};

export const SEVERITY_TEXT: Record<Severity, string> = {
  HIGH: "#9b1c1c",
  MED:  "#7a5e00",
  LOW:  "#166534",
};

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Find each non-space "word" range (simple + good for MVP) */
export function wordIndexMap(text: string) {
  const starts: number[] = [];
  const ends: number[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    starts.push(m.index);
    ends.push(m.index + m[0].length);
  }
  return { starts, ends, count: starts.length };
}

/** Detect if spans are word-indexed; if so, convert to char indices */
export function autoNormalizeSpans(text: string, spans: Span[]) {
  const words = wordIndexMap(text);
  if (!spans.length) return { normalized: [] as Span[], unit: "char" as const };

  const asWord = spans.filter(s => s.end <= words.count).length >= Math.ceil(spans.length * 0.7);
  if (!asWord) return { normalized: spans, unit: "char" as const };

  const normalized = spans.map(s => {
    const wStart = clamp(s.start, 0, Math.max(0, words.count - 1));
    const wEndExclusive = clamp(s.end, 0, words.count);
    const cStart = words.starts[wStart] ?? 0;
    const cEnd = wEndExclusive > 0 ? words.ends[wEndExclusive - 1] : 0;
    return { ...s, start: cStart, end: cEnd };
  });
  return { normalized, unit: "word" as const };
}

export type Segment = { key: string; text: string; style?: React.CSSProperties; id?: string };

/** Build non-overlapping segments for highlighting; resolve overlaps by highest severity */
export function buildSegments(text: string, spans: Span[]): Segment[] {
  if (!text) return [{ key: "all", text }];

  const norm = spans
    .map(s => ({ ...s, start: clamp(s.start ?? 0, 0, text.length), end: clamp(s.end ?? 0, 0, text.length) }))
    .filter(s => s.end > s.start);

  const boundaries = new Set<number>([0, text.length]);
  for (const s of norm) { boundaries.add(s.start); boundaries.add(s.end); }
  const points = Array.from(boundaries).sort((a, b) => a - b);

  const rank: Record<Severity, number> = { HIGH: 3, MED: 2, LOW: 1 };
  const segments: Segment[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    if (a === b) continue;
    const covering = norm.filter(s => s.start <= a && s.end >= b);
    if (!covering.length) {
      segments.push({ key: `seg-${a}-${b}`, text: text.slice(a, b) });
    } else {
      const chosen = covering.reduce((best, s) => (!best || rank[s.severity] > rank[best.severity]) ? s : best, covering[0]);
      segments.push({
        key: `seg-${a}-${b}`,
        text: text.slice(a, b),
        style: { backgroundColor: SEVERITY_BG[chosen.severity], padding: "0 2px", borderRadius: 2 },
        id: `r${chosen.start}-${chosen.end}`,
      });
    }
  }
  return segments;
}
