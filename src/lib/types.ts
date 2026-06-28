// Domain types for MyVW Maintenance.
// These are deliberately storage-agnostic: the Dexie layer (lib/db) persists
// them today, and a future Supabase layer can implement the same shapes.

export type DistanceUnit = "mi" | "km";
export type VolumeUnit = "L" | "gal";

/** Air-cooled VW families we cover. */
export type CarModel =
  | "type1_beetle"
  | "type2_bus"
  | "karmann_ghia"
  | "type3";

export const CAR_MODEL_LABELS: Record<CarModel, string> = {
  type1_beetle: "Beetle (Type 1)",
  type2_bus: "Bus / Transporter (Type 2)",
  karmann_ghia: "Karmann Ghia",
  type3: "Type 3 (1500/1600)",
};

export type Electrics = "6V" | "12V";
export type FuelSystem = "carb" | "fuel_injection";

/**
 * Per-car modification flags. Each one re-shapes the suggested service list
 * (see lib/schedule/applicability.ts). All optional / default false.
 */
export interface CarMods {
  electronicIgnition?: boolean; // Pertronix/123 etc -> no points
  converted12V?: boolean; // pre-67 car converted from 6V
  discBrakeConversion?: boolean; // front discs instead of drums
  fullFlowOilFilter?: boolean; // added spin-on filter -> relaxed oil interval
  engineSwap?: boolean; // non-stock engine (Type 4, dual carb, EFI...)
  efiConversion?: boolean; // aftermarket fuel injection
}

/** Per-service overrides for a single car. */
export interface IntervalOverride {
  miles?: number | null;
  months?: number | null;
  disabled?: boolean;
}

/** A custom, user-defined service item not in the catalog. */
export interface CustomServiceItem {
  key: string; // unique within the car, prefixed "custom:"
  name: string;
  category: ServiceCategory;
  intervalMiles?: number | null;
  intervalMonths?: number | null;
  checklist?: string[];
}

export interface Car {
  id: string;
  nickname: string;
  model: CarModel;
  variant?: string; // e.g. "Bay window", "Notchback", "1303S"
  year: number;
  engine?: string; // e.g. "1600 dual-port"
  electrics: Electrics;
  fuelSystem: FuelSystem;
  vin?: string;
  plate?: string;
  odometer: number;
  distanceUnit: DistanceUnit;
  photoId?: string; // attachment id used as the car's photo
  purchaseDate?: string; // ISO date
  notes?: string;
  mods: CarMods;
  intervalOverrides: Record<string, IntervalOverride>;
  customServiceItems: CustomServiceItem[];
  createdAt: string;
  updatedAt: string;
}

export type ServiceCategory =
  | "engine"
  | "ignition"
  | "fuel"
  | "brakes"
  | "drivetrain"
  | "electrical"
  | "chassis"
  | "body"
  | "modification"
  | "other";

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  engine: "Engine",
  ignition: "Ignition",
  fuel: "Fuel",
  brakes: "Brakes",
  drivetrain: "Drivetrain",
  electrical: "Electrical",
  chassis: "Chassis",
  body: "Body",
  modification: "Modification",
  other: "Other",
};

export interface PartUsed {
  name: string;
  partNumber?: string;
  cost?: number;
}

export interface MaintenanceRecord {
  id: string;
  carId: string;
  serviceKey?: string; // catalog or custom key, if tied to a scheduled item
  title: string; // resolved display title
  category: ServiceCategory;
  date: string; // ISO date the work was done
  odometer?: number;
  cost?: number;
  currency: string;
  performedBy?: string; // "DIY" or a shop name
  parts: PartUsed[];
  notes?: string;
  attachmentIds: string[];
  createdAt: string;
}

export interface FuelLog {
  id: string;
  carId: string;
  date: string;
  odometer: number;
  volume: number;
  volumeUnit: VolumeUnit;
  cost?: number;
  currency: string;
  fullTank: boolean;
  notes?: string;
  createdAt: string;
}

export type AttachmentKind = "receipt" | "photo" | "manual" | "other";

export interface Attachment {
  id: string;
  carId?: string;
  recordId?: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  kind: AttachmentKind;
  createdAt: string;
}

/** A user-created reminder not derived from the schedule. */
export interface Reminder {
  id: string;
  carId: string;
  title: string;
  dueDate?: string;
  dueOdometer?: number;
  done: boolean;
  createdAt: string;
}
