// Data-access layer. ALL persistence goes through this module. Writes go to
// local IndexedDB (Dexie) first for speed/offline, then are mirrored to the
// cloud (Supabase) via the sync hooks below — fire-and-forget so the UI never
// waits on the network. A periodic fullSync() reconciles anything missed.

import { db } from "./schema";
import {
  cloudDelete,
  cloudDeleteAttachment,
  cloudUpsert,
  cloudUpsertAttachment,
} from "../sync";
import type {
  Attachment,
  Car,
  FuelLog,
  MaintenanceRecord,
  Reminder,
} from "../types";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const nowIso = () => new Date().toISOString();

/** Mirror a row to the cloud without blocking the caller. */
function mirror(p: Promise<unknown>) {
  void p.catch(() => {});
}

export type NewCar = Omit<Car, "id" | "createdAt" | "updatedAt">;

export const repo = {
  cars: {
    list: () => db.cars.orderBy("createdAt").toArray(),
    get: (id: string) => db.cars.get(id),
    async add(data: NewCar): Promise<Car> {
      const car: Car = {
        ...data,
        id: newId(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await db.cars.add(car);
      mirror(cloudUpsert("cars", car));
      return car;
    },
    async update(id: string, patch: Partial<Car>): Promise<void> {
      await db.cars.update(id, { ...patch, updatedAt: nowIso() });
      const car = await db.cars.get(id);
      if (car) mirror(cloudUpsert("cars", car));
    },
    /** Set the odometer only if the new value is higher (never roll back). */
    async bumpOdometer(id: string, odometer: number): Promise<void> {
      const car = await db.cars.get(id);
      if (car && odometer > car.odometer) {
        await db.cars.update(id, { odometer, updatedAt: nowIso() });
        const updated = await db.cars.get(id);
        if (updated) mirror(cloudUpsert("cars", updated));
      }
    },
    async remove(id: string): Promise<void> {
      // Capture child ids first so we can tombstone them in the cloud.
      const recordIds = (await db.records.where("carId").equals(id).primaryKeys()) as string[];
      const fuelIds = (await db.fuelLogs.where("carId").equals(id).primaryKeys()) as string[];
      const attIds = (await db.attachments.where("carId").equals(id).primaryKeys()) as string[];
      const reminderIds = (await db.reminders.where("carId").equals(id).primaryKeys()) as string[];

      await db.transaction(
        "rw",
        db.cars,
        db.records,
        db.fuelLogs,
        db.attachments,
        db.reminders,
        async () => {
          await db.records.where("carId").equals(id).delete();
          await db.fuelLogs.where("carId").equals(id).delete();
          await db.attachments.where("carId").equals(id).delete();
          await db.reminders.where("carId").equals(id).delete();
          await db.cars.delete(id);
        },
      );

      cloudDelete("cars", id);
      recordIds.forEach((r) => cloudDelete("records", r));
      fuelIds.forEach((f) => cloudDelete("fuelLogs", f));
      reminderIds.forEach((r) => cloudDelete("reminders", r));
      attIds.forEach((a) => cloudDeleteAttachment(a));
    },
  },

  records: {
    async listByCar(carId: string): Promise<MaintenanceRecord[]> {
      const rows = await db.records.where("carId").equals(carId).toArray();
      return rows.sort((a, b) => b.date.localeCompare(a.date));
    },
    get: (id: string) => db.records.get(id),
    async add(
      data: Omit<MaintenanceRecord, "id" | "createdAt">,
    ): Promise<MaintenanceRecord> {
      const record: MaintenanceRecord = {
        ...data,
        id: newId(),
        createdAt: nowIso(),
      };
      await db.records.add(record);
      mirror(cloudUpsert("records", record));
      if (typeof record.odometer === "number") {
        await repo.cars.bumpOdometer(record.carId, record.odometer);
      }
      return record;
    },
    async update(id: string, patch: Partial<MaintenanceRecord>): Promise<void> {
      await db.records.update(id, patch);
      const rec = await db.records.get(id);
      if (rec) mirror(cloudUpsert("records", rec));
    },
    async remove(id: string): Promise<void> {
      const rec = await db.records.get(id);
      await db.records.delete(id);
      cloudDelete("records", id);
      if (rec) {
        for (const aid of rec.attachmentIds) {
          await db.attachments.delete(aid);
          cloudDeleteAttachment(aid);
        }
      }
    },
  },

  fuelLogs: {
    async listByCar(carId: string): Promise<FuelLog[]> {
      const rows = await db.fuelLogs.where("carId").equals(carId).toArray();
      return rows.sort((a, b) => b.date.localeCompare(a.date));
    },
    async add(data: Omit<FuelLog, "id" | "createdAt">): Promise<FuelLog> {
      const log: FuelLog = { ...data, id: newId(), createdAt: nowIso() };
      await db.fuelLogs.add(log);
      mirror(cloudUpsert("fuelLogs", log));
      await repo.cars.bumpOdometer(log.carId, log.odometer);
      return log;
    },
    async remove(id: string): Promise<void> {
      await db.fuelLogs.delete(id);
      cloudDelete("fuelLogs", id);
    },
  },

  attachments: {
    get: (id: string) => db.attachments.get(id),
    async getMany(ids: string[]): Promise<Attachment[]> {
      const rows = await db.attachments.bulkGet(ids);
      return rows.filter((a): a is Attachment => Boolean(a));
    },
    async add(data: Omit<Attachment, "id" | "createdAt">): Promise<Attachment> {
      const att: Attachment = { ...data, id: newId(), createdAt: nowIso() };
      await db.attachments.add(att);
      mirror(cloudUpsertAttachment(att));
      return att;
    },
    async remove(id: string): Promise<void> {
      await db.attachments.delete(id);
      cloudDeleteAttachment(id);
    },
  },

  reminders: {
    listByCar: (carId: string) =>
      db.reminders.where("carId").equals(carId).toArray(),
    async add(data: Omit<Reminder, "id" | "createdAt">): Promise<Reminder> {
      const reminder: Reminder = { ...data, id: newId(), createdAt: nowIso() };
      await db.reminders.add(reminder);
      mirror(cloudUpsert("reminders", reminder));
      return reminder;
    },
    async update(id: string, patch: Partial<Reminder>): Promise<void> {
      await db.reminders.update(id, patch);
      const r = await db.reminders.get(id);
      if (r) mirror(cloudUpsert("reminders", r));
    },
    async remove(id: string): Promise<void> {
      await db.reminders.delete(id);
      cloudDelete("reminders", id);
    },
  },
};
