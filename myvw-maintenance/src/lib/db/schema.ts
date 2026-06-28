import Dexie, { type Table } from "dexie";
import type {
  Attachment,
  Car,
  FuelLog,
  MaintenanceRecord,
  Reminder,
} from "../types";

// Single IndexedDB database for the whole app. Indexes are chosen for the
// queries we actually run (mostly "by car, newest first").
export class MyVWDatabase extends Dexie {
  cars!: Table<Car, string>;
  records!: Table<MaintenanceRecord, string>;
  fuelLogs!: Table<FuelLog, string>;
  attachments!: Table<Attachment, string>;
  reminders!: Table<Reminder, string>;

  constructor() {
    super("myvw-maintenance");
    this.version(1).stores({
      cars: "id, model, year, createdAt",
      records: "id, carId, serviceKey, date, category",
      fuelLogs: "id, carId, date",
      attachments: "id, carId, recordId, kind",
      reminders: "id, carId, done",
    });
  }
}

export const db = new MyVWDatabase();
