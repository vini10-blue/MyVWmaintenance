import { format, parseISO } from "date-fns";
import type { DistanceUnit, VolumeUnit } from "./types";

const MI_TO_KM = 1.609344;
const GAL_TO_L = 3.785411784; // US gallon

export function milesToUnit(miles: number, unit: DistanceUnit): number {
  return unit === "km" ? miles * MI_TO_KM : miles;
}

export function unitToMiles(value: number, unit: DistanceUnit): number {
  return unit === "km" ? value / MI_TO_KM : value;
}

export function formatDistance(value: number, unit: DistanceUnit): string {
  return `${Math.round(value).toLocaleString()} ${unit}`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMM yyyy");
  } catch {
    return iso;
  }
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatMoney(
  amount: number | undefined,
  currency = "USD",
): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Fuel economy from a volume + distance covered, in display-friendly units. */
export function fuelEconomy(
  distance: number,
  distanceUnit: DistanceUnit,
  volume: number,
  volumeUnit: VolumeUnit,
): string {
  if (distance <= 0 || volume <= 0) return "—";
  if (distanceUnit === "mi") {
    const gal = volumeUnit === "gal" ? volume : volume / GAL_TO_L;
    return `${(distance / gal).toFixed(1)} mpg`;
  }
  // km -> L/100km
  const litres = volumeUnit === "L" ? volume : volume * GAL_TO_L;
  return `${((litres / distance) * 100).toFixed(1)} L/100km`;
}

export const CURRENCIES = ["USD", "EUR", "GBP", "BRL", "CAD", "AUD"];
