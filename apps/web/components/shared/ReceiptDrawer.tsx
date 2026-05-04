"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FileImage, FileText, Trash2, Upload, Receipt } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ProPaywallModal } from "@/components/shared/ProPaywallModal";

// ── Types ──────────────────────────────────────────────────────────────────────

type ReceiptRow = {
  id:        string;
  fileName:  string;
  mimeType:  string;
  createdAt: string;
};

export type DrawerToast = { type: "success" | "error"; message: string } | null;

type Props = {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  usageLabel?:   string;           // e.g. "3 of 5 free receipts used" — shown in header
  onToast:       (t: DrawerToast) => void;  // bubble toasts up to the FAB
  onCountChange: () => void;       // tells the FAB to re-fetch usage after upload/delete
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES  = "image/jpeg,image/png,image/webp,application/pdf";
const ALLOWED_MIMES   = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_FILE_BYTES  = 5 * 1024 * 1024;

function typeLabel(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg":      "JPG",
    "image/png":       "PNG",
    "image/webp":      "WEBP",
    "application/pdf": "PDF",
  };
  return map[mime] ?? mime.split("/")[1]?.toUpperCase() ?? "FILE";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "2-digit" });
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ReceiptDrawer({ open, onOpenChange, usageLabel, onToast, onCountChange }: Props) {
  const inputRef                        = useRef<HTMLInputElement>(null);
  const [receipts,    setReceipts]      = useState<ReceiptRow[]>([]);
  const [loading,     setLoading]       = useState(false);
  const [uploading,   setUploading]     = useState(false);
  const [deletingId,  setDeletingId]    = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen]   = useState(false);

  // Fetch list whenever the drawer opens.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/receipts")
      .then((r) => (r.ok ? r.json() : { receipts: [] }))
      .then(({ receipts: rows }: { receipts: ReceiptRow[] }) => setReceipts(rows))
      .catch(() => setReceipts([]))
      .finally(() => setLoading(false));
  }, [open]);

  // ── Upload ──────────────────────────────────────────────────────────────────

  function handleUploadClick() {
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_MIMES.has(file.type)) {
      onToast({ type: "error", message: "Only JPEG, PNG, WebP, and PDF files are accepted." });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      onToast({ type: "error", message: "File must be 5 MB or smaller." });
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);

      const res  = await fetch("/api/receipts/upload", { method: "POST", body });
      const data = await res.json() as { error?: string; message?: string; receipt?: ReceiptRow };

      if (res.status === 402) {
        setPaywallOpen(true);
        return;
      }

      if (!res.ok) {
        const msg =
          data.error === "INVALID_TYPE" || data.error === "FILE_TOO_LARGE"
            ? (data.message ?? "Invalid file.")
            : "Could not upload receipt. Please try again.";
        onToast({ type: "error", message: msg });
        return;
      }

      onToast({ type: "success", message: "Receipt uploaded" });
      // Prepend the new receipt to the list without a re-fetch.
      if (data.receipt) {
        setReceipts((prev) => [data.receipt as ReceiptRow, ...prev]);
      }
      onCountChange();
    } catch {
      onToast({ type: "error", message: "Could not upload receipt. Please try again." });
    } finally {
      setUploading(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        onToast({ type: "error", message: "Could not delete receipt. Please try again." });
        return;
      }
      setReceipts((prev) => prev.filter((r) => r.id !== id));
      onCountChange();
    } catch {
      onToast({ type: "error", message: "Could not delete receipt. Please try again." });
    } finally {
      setDeletingId(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton={true}
          className="rounded-t-2xl p-0 max-h-[75vh] flex flex-col"
          style={{
            background:  "rgba(11, 17, 29, 0.98)",
            borderTop:   "1px solid rgba(34,197,94,0.14)",
            borderLeft:  "none",
            borderRight: "none",
            boxShadow:   "0 -8px 40px rgba(0,0,0,0.55)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div>
              <SheetTitle
                className="text-[16px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Receipts
              </SheetTitle>
              {usageLabel && (
                <SheetDescription
                  className="mt-0.5 text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {usageLabel}
                </SheetDescription>
              )}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleUploadClick}
              disabled={uploading}
              className="gap-1.5 mr-8"
            >
              {uploading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
              ) : (
                <Upload size={13} strokeWidth={2} />
              )}
              Upload
            </Button>
          </div>

          {/* Receipt list */}
          <div className="flex-1 overflow-y-auto px-5 py-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-[#22C55E]" />
              </div>
            ) : receipts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <Receipt size={22} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
                </div>
                <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                  No receipts yet
                </p>
              </div>
            ) : (
              <ul className="space-y-0.5">
                <AnimatePresence initial={false}>
                  {receipts.map((r) => (
                    <motion.li
                      key={r.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{    opacity: 0, height: 0     }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      {/* File type icon */}
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                      >
                        {r.mimeType === "application/pdf"
                          ? <FileText  size={15} strokeWidth={1.75} style={{ color: "#22C55E"          }} />
                          : <FileImage size={15} strokeWidth={1.75} style={{ color: "rgba(96,165,250,0.9)" }} />
                        }
                      </span>

                      {/* Name + meta */}
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-[13px] font-medium leading-tight"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {r.fileName}
                        </p>
                        <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {formatDate(r.createdAt)}
                          <span className="mx-1.5 opacity-40">·</span>
                          {typeLabel(r.mimeType)}
                        </p>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        aria-label={`Delete ${r.fileName}`}
                        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {deletingId === r.id
                          ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/10 border-t-red-400/60" />
                          : <Trash2 size={14} strokeWidth={1.75} />
                        }
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ProPaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
}
