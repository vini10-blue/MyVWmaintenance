// Data-access layer. ALL persistence goes through this module so that a future
// cloud backend (e.g. Supabase) can implement the same interface without
// touching the UI. Keep it free of React.

import { db } from "./schema";
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
      return car;
    },
    async update(id: string, patch: Partial<Car>): Promise<void> {
      await db.cars.update(id, { ...patch, updatedAt: nowIso() });
    },
    /** Set the odometer only if the new value is higher (never roll back). */
    async bumpOdometer(id: string, odometer: number): Promise<void> {
      const car = await db.cars.get(id);
      if (car && odometer > car.odometer) {
        await db.cars.update(id, { odometer, updatedAt: nowIso() });
      }
    },
    async remove(id: string): Promise<void> {
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
      if (typeof record.odometer === "number") {
        await repo.cars.bumpOdometer(record.carId, record.odometer);
      }
      return record;
    },
    async update(id: string, patch: Partial<MaintenanceRecord>): Promise<void> {
      await db.records.update(id, patch);
    },
    async remove(id: string): Promise<void> {
      const rec = await db.records.get(id);
      await db.records.delete(id);
      if (rec) {
        for (const aid of rec.attachmentIds) await db.attachments.delete(aid);
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
      await repo.cars.bumpOdometer(log.carId, log.odometer);
      return log;
    },
    remove: (id: string) => db.fuelLogs.delete(id),
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
      return att;
    },
    remove: (id: string) => db.attachments.delete(id),
  },

  reminders: {
    listByCar: (carId: string) =>
      db.reminders.where("carId").equals(carId).toArray(),
    async add(data: Omit<Reminder, "id" | "createdAt">): Promise<Reminder> {
      const reminder: Reminder = { ...data, id: newId(), createdAt: nowIso() };
      await db.reminders.add(reminder);
      return reminder;
    },
    update: (id: string, patch: Partial<Reminder>) =>
      db.reminders.update(id, patch),
    remove: (id: string) => db.reminders.delete(id),
  },
};
