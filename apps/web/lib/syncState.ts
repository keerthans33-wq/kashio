// Sync state model for bank-style transaction imports.
//
// Used today by the demo bank flow. Designed to slot in for real Basiq sync
// without any changes — just wire up the same transitions in the Basiq handler.
//
// Usage:
//   const { sync, setConnecting, setSyncing, setSuccess, setError, reset } = useSyncState();
//   if (sync.status === "success") { ... sync.result ... }
//   if (sync.status === "error")   { ... sync.message ... }

import { useState } from "react";

export type SyncResult = {
  inserted: number;
  duplicates: number;
  flagged: number;
  invalid?: number;
};

// Discriminated union — each status carries exactly the data it needs.
export type SyncState =
  | { status: "idle" }
  | { status: "connecting" }
  | { status: "syncing" }
  | { status: "success"; result: SyncResult }
  | { status: "error"; message: string };

export function useSyncState() {
  const [sync, setSync] = useState<SyncState>({ status: "idle" });

  return {
    sync,
    setConnecting: () => setSync({ status: "connecting" }),
    setSyncing:    () => setSync({ status: "syncing" }),
    setSuccess:    (result: SyncResult) => setSync({ status: "success", result }),
    setError:      (message: string)    => setSync({ status: "error", message }),
    reset:         () => setSync({ status: "idle" }),
  };
}
