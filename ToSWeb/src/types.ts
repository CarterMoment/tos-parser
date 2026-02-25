export type Severity = "HIGH" | "MED" | "LOW";

export type Span = {
  label: string;
  severity: Severity;
  start: number; // inclusive
  end: number;   // exclusive
  explanation?: string;
};

export type ApiResult = {
  summary: { risk_count: number; highest_severity: Severity | string };
  spans: Span[];
  model?: any;
};
