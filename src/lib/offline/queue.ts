import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type QueuedReceipt = {
  id: string;
  userId: string;
  organizationId: string;
  truckId: string;
  createdAt: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  sha256: string;
  status: "waiting_to_upload" | "uploading" | "uploaded" | "failed";
  lastError?: string;
};

interface QueueDb extends DBSchema {
  receipts: {
    key: string;
    value: QueuedReceipt;
    indexes: { "by-user": string };
  };
}

const DB_NAME = "fueltrail-offline";
const DB_VERSION = 1;

async function db(): Promise<IDBPDatabase<QueueDb>> {
  return openDB<QueueDb>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      const store = database.createObjectStore("receipts", { keyPath: "id" });
      store.createIndex("by-user", "userId");
    },
  });
}

export async function saveQueuedReceipt(item: QueuedReceipt) {
  const database = await db();
  await database.put("receipts", item);
}

export async function listQueuedReceipts(userId: string) {
  const database = await db();
  const all = await database.getAllFromIndex("receipts", "by-user", userId);
  return all.filter((item) => item.status !== "uploaded");
}

export async function getQueuedReceipt(id: string) {
  const database = await db();
  return database.get("receipts", id);
}

export async function deleteQueuedReceipt(id: string) {
  const database = await db();
  await database.delete("receipts", id);
}

export async function queuedCount(userId: string) {
  const items = await listQueuedReceipts(userId);
  return items.length;
}

export async function updateQueuedReceipt(id: string, patch: Partial<QueuedReceipt>) {
  const database = await db();
  const current = await database.get("receipts", id);
  if (!current) return;
  await database.put("receipts", { ...current, ...patch });
}
