"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FileImage, FileText, Trash2, Upload, Receipt, AlertCircle } from "lucide-react";
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
  comment:   string | null;
  createdAt: string;
};

export type DrawerToast = { type: "success" | "error"; message: string } | null;

type Props = {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  usageLabel?:   string;
  onToast:       (t: DrawerToast) => void;
  onCountChange: () => void;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,application/pdf";
const ALLOWED_MIMES  = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

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

// ── Per-row component ──────────────────────────────────────────────────────────

function ReceiptListItem({
  receipt,
  deleting,
  onDelete,
  onUpdate,
}: {
  receipt:  ReceiptRow;
  deleting: boolean;
  onDelete: () => void;
  onUpdate: (data: { fileName?: string; comment?: string }) => Promise<void>;
}) {
  const [editingName,   setEditingName]   = useState(false);
  const [nameValue,     setNameValue]     = useState(receipt.fileName);
  const [commentValue,  setCommentValue]  = useState(receipt.comment ?? "");
  const [savingName,    setSavingName]    = useState(false);
  const [savingComment, setSavingComment] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Keep local state in sync if parent re-fetches the list.
  useEffect(() => { setNameValue(receipt.fileName); }, [receipt.fileName]);
  useEffect(() => { setCommentValue(receipt.comment ?? ""); }, [receipt.comment]);

  function startEditingName() {
    setEditingName(true);
    // Focus on the next tick after the input renders.
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  async function commitName() {
    const trimmed = nameValue.trim();
    if (!trimmed) { setNameValue(receipt.fileName); setEditingName(false); return; }
    if (trimmed === receipt.fileName) { setEditingName(false); return; }
    setSavingName(true);
    try {
      await onUpdate({ fileName: trimmed });
    } finally {
      setSavingName(false);
      setEditingName(false);
    }
  }

  function cancelName() {
    setNameValue(receipt.fileName);
    setEditingName(false);
  }

  async function commitComment() {
    const trimmed = commentValue.trim();
    const current = receipt.comment ?? "";
    if (trimmed === current) return;
    setSavingComment(true);
    try {
      await onUpdate({ comment: trimmed });
    } finally {
      setSavingComment(false);
    }
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{    opacity: 0, height: 0     }}
      transition={{ duration: 0.18 }}
      className="rounded-xl px-3 py-2.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div className="flex items-start gap-3">
        {/* File type icon */}
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          {receipt.mimeType === "application/pdf"
            ? <FileText  size={15} strokeWidth={1.75} style={{ color: "#22C55E"            }} />
            : <FileImage size={15} strokeWidth={1.75} style={{ color: "rgba(96,165,250,0.9)" }} />
          }
        </span>

        {/* Name + meta + comment */}
        <div className="min-w-0 flex-1">
          {/* Filename — click to rename */}
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter")  { e.preventDefault(); nameInputRef.current?.blur(); }
                if (e.key === "Escape") { e.preventDefault(); cancelName(); }
              }}
              maxLength={255}
              disabled={savingName}
              className="w-full rounded-md px-1.5 py-0.5 text-[13px] font-medium leading-tight outline-none"
              style={{
                color:           "var(--text-primary)",
                backgroundColor: "rgba(255,255,255,0.06)",
                border:          "1px solid rgba(34,197,94,0.35)",
              }}
            />
          ) : (
            <button
              onClick={startEditingName}
              title="Click to rename"
              className="block w-full truncate text-left text-[13px] font-medium leading-tight transition-opacity hover:opacity-70"
              style={{ color: "var(--text-primary)" }}
            >
              {nameValue}
            </button>
          )}

          {/* Date · type */}
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
            {formatDate(receipt.createdAt)}
            <span className="mx-1.5 opacity-40">·</span>
            {typeLabel(receipt.mimeType)}
            {editingName && (
              <span className="ml-2 opacity-60">Enter to save · Esc to cancel</span>
            )}
          </p>

          {/* Comment field */}
          <div className="relative mt-1.5">
            <input
              value={commentValue}
              onChange={(e) => setCommentValue(e.target.value)}
              onBlur={commitComment}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              placeholder="Add a note…"
              maxLength={500}
              disabled={savingComment}
              className="w-full rounded-md px-2 py-1 text-[12px] outline-none placeholder:opacity-30 disabled:opacity-50"
              style={{
                color:           "var(--text-secondary)",
                backgroundColor: "rgba(255,255,255,0.04)",
                border:          "1px solid rgba(255,255,255,0.07)",
              }}
            />
            {savingComment && (
              <span
                className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin rounded-full border border-white/20 border-t-white/60"
              />
            )}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          disabled={deleting}
          aria-label={`Delete ${receipt.fileName}`}
          className="mt-0.5 shrink-0 flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40"
          style={{ color: "var(--text-muted)" }}
        >
          {deleting
            ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/10 border-t-red-400/60" />
            : <Trash2 size={14} strokeWidth={1.75} />
          }
        </button>
      </div>
    </motion.li>
  );
}

// ── Main drawer ────────────────────────────────────────────────────────────────

export function ReceiptDrawer({ open, onOpenChange, usageLabel, onToast, onCountChange }: Props) {
  const inputRef                        = useRef<HTMLInputElement>(null);
  const [receipts,    setReceipts]      = useState<ReceiptRow[]>([]);
  const [loading,     setLoading]       = useState(false);
  const [fetchError,  setFetchError]    = useState(false);
  const [uploading,   setUploading]     = useState(false);
  const [deletingId,  setDeletingId]    = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen]   = useState(false);

  // ── Fetch list ──────────────────────────────────────────────────────────────

  const fetchReceipts = useCallback(() => {
    setLoading(true);
    setFetchError(false);
    fetch("/api/receipts")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ receipts: ReceiptRow[] }>;
      })
      .then(({ receipts: rows }) => setReceipts(rows))
      .catch(() => {
        setFetchError(true);
        setReceipts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (open) fetchReceipts();
  }, [open, fetchReceipts]);

  // ── Upload ──────────────────────────────────────────────────────────────────

  function handleUploadClick() { inputRef.current?.click(); }

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
      const data = await res.json() as { error?: string; message?: string };

      if (res.status === 402) { setPaywallOpen(true); return; }

      if (!res.ok) {
        onToast({ type: "error", message: data.message ?? "Could not upload receipt. Please try again." });
        return;
      }

      onToast({ type: "success", message: "Receipt uploaded" });
      fetchReceipts();
      onCountChange();
    } catch {
      onToast({ type: "error", message: "Could not upload receipt. Please try again." });
    } finally {
      setUploading(false);
    }
  }

  // ── Update (rename / comment) ───────────────────────────────────────────────

  async function handleUpdate(id: string, data: { fileName?: string; comment?: string }) {
    const res = await fetch(`/api/receipts/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    if (!res.ok) {
      onToast({ type: "error", message: "Could not save changes. Please try again." });
      return;
    }
    const { receipt: updated } = await res.json() as {
      receipt: { id: string; fileName: string; comment: string | null };
    };
    // Patch just this row in local state.
    setReceipts((prev) =>
      prev.map((r) => r.id === updated.id ? { ...r, ...updated } : r)
    );
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
          className="rounded-t-2xl p-0 max-h-[80vh] flex flex-col"
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
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <AlertCircle size={22} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
                <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                  Couldn&apos;t load receipts
                </p>
                <button
                  onClick={fetchReceipts}
                  className="text-[12px] underline underline-offset-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Try again
                </button>
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
              <ul className="space-y-1">
                <AnimatePresence initial={false}>
                  {receipts.map((r) => (
                    <ReceiptListItem
                      key={r.id}
                      receipt={r}
                      deleting={deletingId === r.id}
                      onDelete={() => handleDelete(r.id)}
                      onUpdate={(data) => handleUpdate(r.id, data)}
                    />
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
