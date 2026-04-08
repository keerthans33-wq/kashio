// Provider adapter interface for bank-style transaction sources.
//
// Each provider is responsible for:
//   - running a sync (sync)
//   - persisting the last sync result (saveStatus / loadStatus)
//
// The component calls these methods without knowing how they work internally.
// Demo Bank uses localStorage. A real bank provider would call an API instead.
//
// To add a new provider, implement BankProvider and pass it to handleSync():
//
//   export const basiqProvider: BankProvider = {
//     source: "BASIQ",
//     name: "Connected Bank",
//     async sync() {
//       const res = await fetch("/api/basiq/transactions", { method: "POST" });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error ?? "Bank sync failed.");
//       return data;
//     },
//     loadStatus() {
//       // fetch from /api/sync/status or a provider-specific store
//       return null;
//     },
//     saveStatus(_result) {
//       // no-op if the server persists status automatically
//     },
//   };

import type { SyncResult } from "./syncState";

export type TransactionSource = "CSV" | "DEMO_BANK" | "BASIQ";

export type StoredSyncStatus = {
  lastSynced: string; // ISO string
  result: SyncResult;
};

export interface BankProvider {
  source: TransactionSource;           // matches the TransactionSource DB enum
  name: string;                        // shown in the UI (e.g. "Demo Bank", "ANZ")
  sync: () => Promise<SyncResult>;     // runs the import; throws on failure
  loadStatus: () => StoredSyncStatus | null; // returns last sync status, or null if none
  saveStatus: (result: SyncResult) => void;  // persists a completed sync result
  isConnected: () => boolean;          // true if this provider is ready to sync
  // For real providers, isConnected would check a DB record or a cached API response.
  // For demo, having a stored sync status is enough to consider it connected.
}

// ── Demo Bank ─────────────────────────────────────────────────────────────────

export function createDemoBankProvider(userId: string): BankProvider {
  const key = `kashio:demo-sync-status:${userId}`;

  return {
    source: "DEMO_BANK",
    name: "Demo Bank",

    async sync() {
      const res = await fetch("/api/demo/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Demo sync failed.");
      return data as SyncResult;
    },

    loadStatus() {
      try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as StoredSyncStatus) : null;
      } catch {
        return null;
      }
    },

    saveStatus(result) {
      const value: StoredSyncStatus = { lastSynced: new Date().toISOString(), result };
      localStorage.setItem(key, JSON.stringify(value));
    },

    isConnected() {
      return this.loadStatus() !== null;
    },
  };
}

// Fallback for places that haven't loaded the userId yet
export const demoBankProvider = createDemoBankProvider("anon");
