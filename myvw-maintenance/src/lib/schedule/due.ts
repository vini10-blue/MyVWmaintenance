import { differenceInCalendarMonths } from "date-fns";
import type { Car, MaintenanceRecord } from "../types";
import { milesToUnit } from "../format";
import type { ResolvedService } from "./applicability";

export type DueLevel = "overdue" | "due_soon" | "ok" | "unknown";

export interface DueStatus {
  service: ResolvedService;
  level: DueLevel;
  /** Most recent matching record, if any. */
  last?: MaintenanceRecord;
  /** Distance until/over due, in the car's unit (negative = overdue). */
  distanceRemaining?: number;
  /** Months until/over due (negative = overdue). */
  monthsRemaining?: number;
  /** Human summary, e.g. "Overdue by 400 mi". */
  summary: string;
}

// Within this fraction of the interval remaining, we flag "due soon".
const SOON_FRACTION = 0.15;
const SOON_MONTHS = 1;

function latestRecordFor(
  serviceKey: string,
  records: MaintenanceRecord[],
): MaintenanceRecord | undefined {
  // records are expected newest-first; find first matching key.
  return records.find((r) => r.serviceKey === serviceKey);
}

export function computeDue(
  car: Car,
  service: ResolvedService,
  records: MaintenanceRecord[],
  now: Date = new Date(),
): DueStatus {
  const last = latestRecordFor(service.key, records);

  const intervalDist =
    service.intervalMiles != null
      ? milesToUnit(service.intervalMiles, car.distanceUnit)
      : null;
  const intervalMonths = service.intervalMonths ?? null;

  if (!last) {
    // Never logged: we can't know how overdue, but surface it as actionable.
    return {
      service,
      level: "unknown",
      summary: "Not logged yet",
    };
  }

  let distanceRemaining: number | undefined;
  let monthsRemaining: number | undefined;
  const reasons: DueLevel[] = [];

  if (intervalDist != null && typeof last.odometer === "number") {
    const dueAt = last.odometer + intervalDist;
    distanceRemaining = Math.round(dueAt - car.odometer);
    if (distanceRemaining <= 0) reasons.push("overdue");
    else if (distanceRemaining <= intervalDist * SOON_FRACTION)
      reasons.push("due_soon");
    else reasons.push("ok");
  }

  if (intervalMonths != null) {
    const elapsed = differenceInCalendarMonths(now, new Date(last.date));
    monthsRemaining = intervalMonths - elapsed;
    if (monthsRemaining <= 0) reasons.push("overdue");
    else if (monthsRemaining <= SOON_MONTHS) reasons.push("due_soon");
    else reasons.push("ok");
  }

  let level: DueLevel = "ok";
  if (reasons.length === 0) level = "unknown";
  else if (reasons.includes("overdue")) level = "overdue";
  else if (reasons.includes("due_soon")) level = "due_soon";

  return {
    service,
    level,
    last,
    distanceRemaining,
    monthsRemaining,
    summary: summarise(level, distanceRemaining, monthsRemaining, car.distanceUnit),
  };
}

function summarise(
  level: DueLevel,
  dist: number | undefined,
  months: number | undefined,
  unit: string,
): string {
  if (level === "unknown") return "Not logged yet";
  const parts: string[] = [];
  if (dist != null) {
    const abs = Math.abs(dist);
    parts.push(`${abs.toLocaleString()} ${unit}`);
  }
  if (months != null) {
    const abs = Math.abs(months);
    parts.push(`${abs} mo`);
  }
  const metric = parts.join(" / ");
  if (level === "overdue") return metric ? `Overdue by ${metric}` : "Overdue";
  if (level === "due_soon") return metric ? `Due in ${metric}` : "Due soon";
  return metric ? `OK — ${metric} left` : "OK";
}

const LEVEL_RANK: Record<DueLevel, number> = {
  overdue: 0,
  due_soon: 1,
  unknown: 2,
  ok: 3,
};

/** Compute and sort all due statuses for a car (most urgent first). */
export function computeAllDue(
  car: Car,
  services: ResolvedService[],
  records: MaintenanceRecord[],
  now: Date = new Date(),
): DueStatus[] {
  return services
    .map((s) => computeDue(car, s, records, now))
    .sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);
}
