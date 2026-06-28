import type { DueLevel } from "../lib/schedule/due";

const LABEL: Record<DueLevel, string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
  ok: "OK",
  unknown: "Not logged",
};

export function DueBadge({ level }: { level: DueLevel }) {
  return <span className={`badge badge--${level}`}>{LABEL[level]}</span>;
}
