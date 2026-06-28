import type { Car } from "../types";
import {
  CATALOG_BY_KEY,
  SERVICE_CATALOG,
  type ServiceItem,
} from "./catalog";

/**
 * A service item resolved for a specific car: catalog defaults merged with the
 * car's per-item overrides, plus a flag for where it came from.
 */
export interface ResolvedService {
  key: string;
  name: string;
  category: ServiceItem["category"];
  description?: string;
  intervalMiles?: number | null;
  intervalMonths?: number | null;
  checklist: string[];
  severity: ServiceItem["severity"];
  sourceNote?: string;
  origin: "catalog" | "custom";
}

function matchesAppliesTo(car: Car, item: ServiceItem): boolean {
  const a = item.appliesTo;
  if (!a) return true;
  if (a.models && !a.models.includes(car.model)) return false;
  if (a.minYear !== undefined && car.year < a.minYear) return false;
  if (a.maxYear !== undefined && car.year > a.maxYear) return false;
  if (a.fuelSystems && !a.fuelSystems.includes(car.fuelSystem)) return false;
  if (a.electrics && car.electrics !== a.electrics) return false;
  return true;
}

/**
 * Apply per-car modifications: remove, swap or relax catalog items.
 * Returns the catalog key to keep, or null to drop it.
 */
function modFilter(car: Car, item: ServiceItem): boolean {
  const m = car.mods ?? {};
  // Electronic ignition removes points & condenser maintenance.
  if (item.key === "points_condenser" && m.electronicIgnition) return false;
  // Disc-brake conversion: drum-specific guidance is dropped (general
  // brake inspection item still applies).
  // (We keep brakes_inspect but adjust its checklist below.)
  // EFI conversion on a carb car: hide carb idle, show FI check instead.
  if (item.key === "carb_idle" && (m.efiConversion || m.engineSwap)) return false;
  return true;
}

function applyModAdjustments(car: Car, resolved: ResolvedService): ResolvedService {
  const m = car.mods ?? {};
  let r = resolved;
  // Relax the strict oil interval when a full-flow filter is fitted.
  if (r.key === "engine_oil" && m.fullFlowOilFilter) {
    r = {
      ...r,
      intervalMiles: r.intervalMiles ? Math.max(r.intervalMiles, 5000) : 5000,
      sourceNote:
        "Interval relaxed because a full-flow oil filter is fitted (verify for your setup).",
    };
  }
  // Disc-brake conversion: tweak the brake checklist wording.
  if (r.key === "brakes_inspect" && m.discBrakeConversion) {
    r = {
      ...r,
      checklist: [
        "Inspect pads and discs for wear/scoring",
        "Check calipers for leaks and free movement",
        "Inspect rear shoes/drums (if still drum)",
        "Check fluid level",
      ],
    };
  }
  return r;
}

function override(car: Car, item: ServiceItem): ResolvedService | null {
  const ov = car.intervalOverrides?.[item.key];
  if (ov?.disabled) return null;
  const resolved: ResolvedService = {
    key: item.key,
    name: item.name,
    category: item.category,
    description: item.description,
    intervalMiles: ov?.miles ?? item.intervalMiles ?? null,
    intervalMonths: ov?.months ?? item.intervalMonths ?? null,
    checklist: item.checklist,
    severity: item.severity,
    sourceNote: item.sourceNote,
    origin: "catalog",
  };
  return applyModAdjustments(car, resolved);
}

/**
 * The full, ordered list of services that apply to a car: catalog items
 * (filtered by applicability + mods + overrides) followed by custom items.
 */
export function resolveServicesForCar(car: Car): ResolvedService[] {
  const fromCatalog: ResolvedService[] = [];
  for (const item of SERVICE_CATALOG) {
    if (!matchesAppliesTo(car, item)) continue;
    if (!modFilter(car, item)) continue;
    const resolved = override(car, item);
    if (resolved) fromCatalog.push(resolved);
  }

  // Add an EFI check if the car was converted to EFI but is catalogued as carb.
  if ((car.mods?.efiConversion || car.fuelSystem === "fuel_injection") &&
      !fromCatalog.some((r) => r.key === "fi_check")) {
    const fi = CATALOG_BY_KEY["fi_check"];
    if (fi && !car.intervalOverrides?.["fi_check"]?.disabled) {
      fromCatalog.push({
        key: fi.key,
        name: fi.name,
        category: fi.category,
        description: fi.description,
        intervalMiles: fi.intervalMiles ?? null,
        intervalMonths: fi.intervalMonths ?? null,
        checklist: fi.checklist,
        severity: fi.severity,
        sourceNote: fi.sourceNote,
        origin: "catalog",
      });
    }
  }

  const custom: ResolvedService[] = (car.customServiceItems ?? []).map((c) => ({
    key: c.key,
    name: c.name,
    category: c.category,
    intervalMiles: c.intervalMiles ?? null,
    intervalMonths: c.intervalMonths ?? null,
    checklist: c.checklist ?? [],
    severity: "routine",
    origin: "custom",
  }));

  return [...fromCatalog, ...custom];
}
