// Cloud mirror / sync engine.
//
// Strategy: the app keeps writing to local IndexedDB (Dexie) exactly as before.
// On top of that, every change is also pushed to Supabase, and a full sync
// (push everything local, then pull everything remote) runs on sign-in, on
// window focus and when the network returns. Upserts are idempotent and rows
// are keyed by their stable id, so re-running a sync is always safe.
//
// Each entity is stored in the cloud as a generic row: { id, user_id, data,
// updated_at, deleted }. This keeps the schema tiny and avoids mapping every
// field to a column. Attachment *files* live in Supabase Storage; their
// metadata lives in the `attachments` table.

import { db } from "./db/schema";
import { ATTACHMENT_BUCKET, supabase } from "./supabase";
import type { Attachment } from "./types";

type EntityKey = "cars" | "records" | "fuelLogs" | "reminders";

const CLOUD_TABLE: Record<EntityKey, string> = {
  cars: "cars",
  records: "records",
  fuelLogs: "fuel_logs",
  reminders: "reminders",
};

const ENTITY_KEYS: EntityKey[] = ["cars", "records", "fuelLogs", "reminders"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dexieTable(key: EntityKey): any {
  return (db as unknown as Record<string, unknown>)[key];
}

function tsOf(obj: { updatedAt?: string; createdAt?: string }): string {
  return obj.updatedAt || obj.createdAt || new Date().toISOString();
}

async function uid(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ---- simple status pub/sub so the UI can show a spinner ------------------
export type SyncStatus = "idle" | "syncing" | "error" | "offline";
let status: SyncStatus = "idle";
let lastSyncAt: string | null = null;
const listeners = new Set<(s: SyncStatus, at: string | null) => void>();

function setStatus(s: SyncStatus) {
  status = s;
  listeners.forEach((l) => l(status, lastSyncAt));
}
export function getSyncStatus() {
  return { status, lastSyncAt };
}
export function onSyncStatus(cb: (s: SyncStatus, at: string | null) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// ---- deletion queue (survives offline) -----------------------------------
const DEL_KEY = "myvw_pending_deletions";
type Deletion = { key: EntityKey | "attachments"; id: string };

function readDeletions(): Deletion[] {
  try {
    return JSON.parse(localStorage.getItem(DEL_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeDeletions(d: Deletion[]) {
  localStorage.setItem(DEL_KEY, JSON.stringify(d));
}
function queueDeletion(d: Deletion) {
  const all = readDeletions();
  if (!all.some((x) => x.key === d.key && x.id === d.id)) {
    all.push(d);
    writeDeletions(all);
  }
}

async function flushDeletions(userId: string) {
  const all = readDeletions();
  if (!all.length || !supabase) return;
  const remaining: Deletion[] = [];
  for (const d of all) {
    try {
      const now = new Date().toISOString();
      if (d.key === "attachments") {
        await supabase
          .from("attachments")
          .upsert({ id: d.id, user_id: userId, deleted: true, updated_at: now });
        await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .remove([`${userId}/${d.id}`]);
      } else {
        await supabase
          .from(CLOUD_TABLE[d.key])
          .upsert({ id: d.id, user_id: userId, deleted: true, updated_at: now });
      }
    } catch {
      remaining.push(d);
    }
  }
  writeDeletions(remaining);
}

// ---- per-write hooks (called from repo.ts, fire-and-forget) --------------
export async function cloudUpsert(
  key: EntityKey,
  obj: { id: string; updatedAt?: string; createdAt?: string },
): Promise<void> {
  if (!supabase) return;
  const userId = await uid();
  if (!userId) return;
  await supabase
    .from(CLOUD_TABLE[key])
    .upsert({ id: obj.id, user_id: userId, data: obj, updated_at: tsOf(obj), deleted: false });
}

function flushSoon(): void {
  uid()
    .then((u) => {
      if (u) return flushDeletions(u);
    })
    .catch(() => {});
}

export function cloudDelete(key: EntityKey, id: string): void {
  queueDeletion({ key, id });
  flushSoon();
}

export async function cloudUpsertAttachment(att: Attachment): Promise<void> {
  if (!supabase) return;
  const userId = await uid();
  if (!userId) return;
  const path = `${userId}/${att.id}`;
  await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, att.blob, { upsert: true, contentType: att.mimeType });
  await supabase.from("attachments").upsert({
    id: att.id,
    user_id: userId,
    car_id: att.carId ?? null,
    record_id: att.recordId ?? null,
    kind: att.kind,
    filename: att.filename,
    mime: att.mimeType,
    updated_at: att.createdAt,
    deleted: false,
  });
}

export function cloudDeleteAttachment(id: string): void {
  queueDeletion({ key: "attachments", id });
  flushSoon();
}

// ---- bulk push / pull -----------------------------------------------------
async function pushAllLocal(userId: string) {
  if (!supabase) return;
  for (const key of ENTITY_KEYS) {
    const rows: Array<{ id: string; updatedAt?: string; createdAt?: string }> =
      await dexieTable(key).toArray();
    if (!rows.length) continue;
    const payload = rows.map((r) => ({
      id: r.id,
      user_id: userId,
      data: r,
      updated_at: tsOf(r),
      deleted: false,
    }));
    await supabase.from(CLOUD_TABLE[key]).upsert(payload);
  }
  // Attachments (files + metadata).
  const atts: Attachment[] = await db.attachments.toArray();
  for (const att of atts) await cloudUpsertAttachment(att);
}

async function pullAll(userId: string) {
  if (!supabase) return;
  for (const key of ENTITY_KEYS) {
    const { data, error } = await supabase
      .from(CLOUD_TABLE[key])
      .select("id,data,updated_at,deleted")
      .eq("user_id", userId);
    if (error || !data) continue;
    const table = dexieTable(key);
    for (const row of data) {
      if (row.deleted) {
        await table.delete(row.id);
        continue;
      }
      const local = await table.get(row.id);
      const cloudMs = Date.parse(row.updated_at);
      const localMs = local ? Date.parse(tsOf(local)) : -Infinity;
      if (!local || cloudMs >= localMs) await table.put(row.data);
    }
  }
  await pullAttachments(userId);
}

async function pullAttachments(userId: string) {
  if (!supabase) return;
  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("user_id", userId);
  if (error || !data) return;
  for (const row of data) {
    if (row.deleted) {
      await db.attachments.delete(row.id);
      continue;
    }
    const local = await db.attachments.get(row.id);
    if (local) continue; // file already present locally
    const path = `${userId}/${row.id}`;
    const { data: file } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .download(path);
    if (file) {
      await db.attachments.put({
        id: row.id,
        carId: row.car_id ?? undefined,
        recordId: row.record_id ?? undefined,
        blob: file,
        filename: row.filename,
        mimeType: row.mime,
        kind: row.kind,
        createdAt: row.updated_at,
      });
    }
  }
}

const LAST_USER_KEY = "myvw_last_user";

/** Wipe all locally-stored data (used when switching accounts). */
export async function clearLocalData(): Promise<void> {
  await Promise.all([
    db.cars.clear(),
    db.records.clear(),
    db.fuelLogs.clear(),
    db.attachments.clear(),
    db.reminders.clear(),
  ]);
  localStorage.removeItem(DEL_KEY);
}

let syncing = false;

/** Push everything local, then pull everything remote. Safe to call often. */
export async function fullSync(): Promise<void> {
  if (!supabase || syncing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setStatus("offline");
    return;
  }
  const userId = await uid();
  if (!userId) return;
  syncing = true;
  setStatus("syncing");
  try {
    // If a *different* account was last active on this device, drop the local
    // data first so one user's records can never be pushed into another user's
    // cloud account (or shown to them). A first-ever login keeps any data the
    // user entered before signing in, so it gets uploaded to their account.
    const lastUser = localStorage.getItem(LAST_USER_KEY);
    if (lastUser && lastUser !== userId) {
      await clearLocalData();
    }
    await flushDeletions(userId);
    await pushAllLocal(userId);
    await pullAll(userId);
    localStorage.setItem(LAST_USER_KEY, userId);
    lastSyncAt = new Date().toISOString();
    setStatus("idle");
  } catch {
    setStatus("error");
  } finally {
    syncing = false;
  }
}
