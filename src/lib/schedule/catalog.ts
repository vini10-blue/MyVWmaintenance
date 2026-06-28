import type { CarModel, FuelSystem, ServiceCategory } from "../types";

// ---------------------------------------------------------------------------
// Air-cooled VW maintenance knowledge base.
//
// These are *curated, general* classic-VW intervals (Beetle / Bus / Karmann
// Ghia / Type 3). They are guidance, not a substitute for the workshop manual
// (e.g. Bentley) for your exact car. Every interval can be overridden per car.
// ---------------------------------------------------------------------------

export interface AppliesTo {
  /** If set, only these models. Omit for "all air-cooled". */
  models?: CarModel[];
  /** Inclusive model-year bounds. */
  minYear?: number;
  maxYear?: number;
  /** Only for these fuel systems. */
  fuelSystems?: FuelSystem[];
  /** Only when the car has 6V / 12V electrics. */
  electrics?: "6V" | "12V";
}

export interface ServiceItem {
  key: string;
  name: string;
  category: ServiceCategory;
  description: string;
  /** Mileage interval (in miles). Converted for km cars at display time. */
  intervalMiles?: number;
  /** Time interval in months. */
  intervalMonths?: number;
  appliesTo?: AppliesTo;
  checklist: string[];
  severity: "critical" | "important" | "routine";
  sourceNote?: string;
}

export const SERVICE_CATALOG: ServiceItem[] = [
  {
    key: "engine_oil",
    name: "Engine oil change",
    category: "engine",
    description:
      "Air-cooled engines have only a strainer (no full-flow filter), so oil must be changed often.",
    intervalMiles: 3000,
    intervalMonths: 6,
    checklist: [
      "Warm engine, then drain oil",
      "Remove and clean oil strainer; fit new gaskets",
      "Refill with correct grade (e.g. SAE 30 / 20W-50 per climate)",
      "Run and check for leaks",
    ],
    severity: "critical",
    sourceNote: "Classic air-cooled interval; relax if a full-flow filter is fitted.",
  },
  {
    key: "valve_adjustment",
    name: "Valve clearance adjustment",
    category: "engine",
    description:
      "Critical on air-cooled engines — tight exhaust valves cause burnt valves and dropped seats.",
    intervalMiles: 3000,
    intervalMonths: 6,
    checklist: [
      "Adjust with engine cold",
      "Set clearance to spec (typ. 0.006 in / 0.15 mm)",
      "Work cylinder by cylinder at TDC",
      "Replace valve cover gaskets",
    ],
    severity: "critical",
  },
  {
    key: "spark_plugs",
    name: "Spark plugs",
    category: "ignition",
    description: "Inspect/clean and re-gap; replace as needed.",
    intervalMiles: 6000,
    intervalMonths: 12,
    checklist: [
      "Remove and read plug colour",
      "Gap to spec (typ. 0.025 in / 0.6 mm)",
      "Replace if worn or fouled",
    ],
    severity: "important",
  },
  {
    key: "points_condenser",
    name: "Ignition points & condenser",
    category: "ignition",
    description: "Clean/gap contact points and set dwell. Not needed with electronic ignition.",
    intervalMiles: 6000,
    intervalMonths: 12,
    appliesTo: { fuelSystems: ["carb", "fuel_injection"] },
    checklist: [
      "Inspect points for pitting",
      "Set point gap / dwell to spec",
      "Replace condenser if ignition is erratic",
    ],
    severity: "important",
    sourceNote: "Omitted automatically when 'electronic ignition' is enabled.",
  },
  {
    key: "ignition_timing",
    name: "Ignition timing",
    category: "ignition",
    description: "Check and set timing with a strobe light.",
    intervalMiles: 6000,
    intervalMonths: 12,
    checklist: [
      "Connect timing light",
      "Set timing to spec for your distributor",
      "Verify vacuum/centrifugal advance operates",
    ],
    severity: "important",
  },
  {
    key: "air_filter",
    name: "Air filter service",
    category: "engine",
    description:
      "Service the oil-bath filter (or replace paper element). More often in dusty conditions.",
    intervalMiles: 6000,
    intervalMonths: 12,
    checklist: [
      "Oil-bath: empty, clean and refill to mark with fresh oil",
      "Paper element: replace",
      "Check intake hoses and clamps",
    ],
    severity: "routine",
  },
  {
    key: "carb_idle",
    name: "Carburettor adjustment",
    category: "fuel",
    description: "Set idle speed and mixture; sync if twin carbs.",
    intervalMiles: 6000,
    intervalMonths: 12,
    appliesTo: { fuelSystems: ["carb"] },
    checklist: [
      "Set idle speed to spec",
      "Adjust idle mixture screw for smooth running",
      "Synchronise linkage on twin-carb setups",
    ],
    severity: "routine",
  },
  {
    key: "fi_check",
    name: "Fuel-injection check (D-Jetronic)",
    category: "fuel",
    description: "Inspect injectors, sensors and connections on FI cars.",
    intervalMiles: 6000,
    intervalMonths: 12,
    appliesTo: { fuelSystems: ["fuel_injection"] },
    checklist: [
      "Check injector spray and seals",
      "Inspect wiring harness and ground connections",
      "Verify pressure regulator and cold-start behaviour",
    ],
    severity: "important",
  },
  {
    key: "fan_belt",
    name: "Fan belt",
    category: "engine",
    description:
      "Drives the cooling fan AND generator/alternator — a broken belt overheats the engine fast.",
    intervalMiles: 6000,
    intervalMonths: 12,
    checklist: [
      "Check tension (about 1/2 in deflection)",
      "Inspect for cracks/glazing",
      "Carry a spare belt",
    ],
    severity: "critical",
  },
  {
    key: "brakes_inspect",
    name: "Brake inspection & adjustment",
    category: "brakes",
    description: "Inspect linings/pads, adjust drums, check for leaks.",
    intervalMiles: 6000,
    intervalMonths: 12,
    checklist: [
      "Inspect shoes/pads and drums/discs",
      "Adjust drum brakes (where fitted)",
      "Check wheel cylinders/calipers for leaks",
      "Check fluid level",
    ],
    severity: "important",
  },
  {
    key: "brake_fluid",
    name: "Brake fluid flush",
    category: "brakes",
    description: "Brake fluid absorbs moisture; flush to prevent corrosion and fade.",
    intervalMonths: 24,
    checklist: [
      "Bleed through fresh DOT fluid at each wheel",
      "Inspect flexible hoses for cracks",
    ],
    severity: "important",
  },
  {
    key: "gearbox_oil",
    name: "Transmission / gearbox oil",
    category: "drivetrain",
    description: "Change the gear oil in the transaxle.",
    intervalMiles: 30000,
    intervalMonths: 48,
    checklist: [
      "Drain and refill with correct GL gear oil",
      "Check for leaks at axle boots/seals",
    ],
    severity: "routine",
  },
  {
    key: "wheel_bearings",
    name: "Front wheel bearings",
    category: "chassis",
    description: "Clean, inspect and repack front wheel bearings with grease.",
    intervalMiles: 30000,
    intervalMonths: 48,
    checklist: [
      "Clean and inspect bearings/races",
      "Repack with fresh grease",
      "Set preload correctly",
    ],
    severity: "routine",
  },
  {
    key: "fuel_lines",
    name: "Rubber fuel lines",
    category: "fuel",
    description:
      "Aged rubber fuel line is a leading cause of classic-VW fires. Inspect and replace regularly.",
    intervalMonths: 48,
    checklist: [
      "Inspect all rubber hose for cracks/softness",
      "Replace with correct fuel-rated hose and clamps",
      "Check routing away from heat",
    ],
    severity: "critical",
  },
  {
    key: "chassis_grease",
    name: "Chassis lubrication",
    category: "chassis",
    description: "Grease front beam fittings and link pins (where fitted).",
    intervalMiles: 3000,
    intervalMonths: 12,
    appliesTo: { maxYear: 1965 },
    checklist: [
      "Grease front-axle nipples / link & king pins",
      "Check steering box oil level",
    ],
    severity: "routine",
    sourceNote: "Mainly king/link-pin front beams (earlier cars).",
  },
  {
    key: "tyres_rotate",
    name: "Tyres & pressures",
    category: "chassis",
    description: "Check pressures, condition and rotate.",
    intervalMiles: 6000,
    intervalMonths: 6,
    checklist: [
      "Set pressures to spec",
      "Inspect for cracking/age (classics often have old rubber)",
      "Rotate if wear is even",
    ],
    severity: "routine",
  },
  {
    key: "battery_electrical",
    name: "Battery & electrical check",
    category: "electrical",
    description: "Check battery, charging and lights.",
    intervalMonths: 12,
    checklist: [
      "Check battery terminals and electrolyte",
      "Verify charging voltage",
      "Test all lights, indicators and wipers",
    ],
    severity: "routine",
  },
];

export const CATALOG_BY_KEY: Record<string, ServiceItem> = Object.fromEntries(
  SERVICE_CATALOG.map((s) => [s.key, s]),
);
