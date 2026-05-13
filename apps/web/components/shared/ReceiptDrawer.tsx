"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { FileImage, FileText, Trash2, Upload, Receipt, AlertCircle, Camera, FolderOpen, X, ExternalLink, Download } from "lucide-react";
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
  signedUrl: string | null;
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

// ── Full-screen receipt viewer ─────────────────────────────────────────────────

function ReceiptViewer({
  receipt,
  isNative,
  onClose,
}: {
  receipt:  ReceiptRow;
  isNative: boolean;
  onClose:  () => void;
}) {
  const isImage = receipt.mimeType.startsWith("image/");
  const [downloading, setDownloading] = useState(false);
  const [imgStatus,   setImgStatus]   = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function handleDownload() {
    if (!receipt.signedUrl) return;
    setDownloading(true);
    try {
      if (isNative) {
        // Fetch file → write to Capacitor cache dir → iOS share sheet (Save to Photos / Files)
        const { Filesystem, Directory } = await import("@capacitor/filesystem");
        const { Share } = await import("@capacitor/share");

        const res  = await fetch(receipt.signedUrl);
        const blob = await res.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const written = await Filesystem.writeFile({
          path:      receipt.fileName,
          data:      base64,
          directory: Directory.Cache,
        });

        await Share.share({
          title:      receipt.fileName,
          url:        written.uri,
          dialogTitle: "Save receipt",
        });
      } else {
        // Web: blob download triggers Save dialog with the original filename
        const res  = await fetch(receipt.signedUrl);
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = receipt.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      window.open(receipt.signedUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[300] flex flex-col"
      style={{ backgroundColor: "rgba(0,0,0,0.94)" }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <p
          className="text-[13px] font-medium truncate"
          style={{ color: "rgba(255,255,255,0.80)" }}
        >
          {receipt.fileName}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {/* Download button — always shown if there's a URL (image or PDF) */}
          {receipt.signedUrl && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              aria-label="Download"
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-50"
              style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
            >
              {downloading
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
                : <Download size={15} strokeWidth={2} style={{ color: "rgba(255,255,255,0.85)" }} />
              }
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
          >
            <X size={16} strokeWidth={2.2} style={{ color: "rgba(255,255,255,0.85)" }} />
          </button>
        </div>
      </div>

      {/* Image content
          min-h-0 is critical: without it, a flex-1 child in a flex-col won't
          shrink below its content size, so max-h-full on the <img> resolves
          incorrectly in WKWebView and the image renders at the wrong size.   */}
      {isImage && (
        <div className="flex-1 min-h-0 flex items-center justify-center p-4">
          {receipt.signedUrl ? (
            <div className="relative flex items-center justify-center w-full h-full">
              {/* Spinner shown while image loads */}
              {imgStatus === "loading" && (
                <span className="absolute h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#22C55E]" />
              )}
              {imgStatus === "error" ? (
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.40)" }}>
                  Could not load image
                </p>
              ) : (
                <img
                  src={receipt.signedUrl}
                  alt={receipt.fileName}
                  onLoad={() => setImgStatus("loaded")}
                  onError={() => setImgStatus("error")}
                  className="max-h-full max-w-full object-contain rounded-xl transition-opacity duration-300"
                  style={{
                    opacity:    imgStatus === "loaded" ? 1 : 0,
                    boxShadow:  "0 4px 40px rgba(0,0,0,0.70)",
                  }}
                />
              )}
            </div>
          ) : (
            <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.40)" }}>
              Preview unavailable
            </p>
          )}
        </div>
      )}

      {/* PDF content */}
      {!isImage && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.20)" }}
          >
            <FileText size={28} strokeWidth={1.5} style={{ color: "#22C55E" }} />
          </div>
          <p className="text-[15px] font-semibold text-center" style={{ color: "rgba(255,255,255,0.85)" }}>
            {receipt.fileName}
          </p>
          <p className="text-[12px] text-center" style={{ color: "rgba(255,255,255,0.40)" }}>
            PDF documents open in your browser
          </p>
          {receipt.signedUrl && (
            <a
              href={receipt.signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#22C55E", color: "#000" }}
            >
              <ExternalLink size={14} strokeWidth={2.5} />
              Open PDF
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Per-row component ──────────────────────────────────────────────────────────

function ReceiptListItem({
  receipt,
  deleting,
  onDelete,
  onUpdate,
  onView,
}: {
  receipt:  ReceiptRow;
  deleting: boolean;
  onDelete: () => void;
  onUpdate: (data: { fileName?: string; comment?: string }) => Promise<void>;
  onView:   () => void;
}) {
  const isImage = receipt.mimeType.startsWith("image/");

  const [editingName,   setEditingName]   = useState(false);
  const [nameValue,     setNameValue]     = useState(receipt.fileName);
  const [commentValue,  setCommentValue]  = useState(receipt.comment ?? "");
  const [savingName,    setSavingName]    = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [imgFailed,     setImgFailed]     = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setNameValue(receipt.fileName); },   [receipt.fileName]);
  useEffect(() => { setCommentValue(receipt.comment ?? ""); }, [receipt.comment]);

  function startEditingName() {
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  async function commitName() {
    const trimmed = nameValue.trim();
    if (!trimmed) { setNameValue(receipt.fileName); setEditingName(false); return; }
    if (trimmed === receipt.fileName) { setEditingName(false); return; }
    setSavingName(true);
    try { await onUpdate({ fileName: trimmed }); }
    finally { setSavingName(false); setEditingName(false); }
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
    try { await onUpdate({ comment: trimmed }); }
    finally { setSavingComment(false); }
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
        {/* Thumbnail / icon — tap to view */}
        <button
          onClick={onView}
          aria-label={`View ${receipt.fileName}`}
          className="mt-0.5 shrink-0 flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden transition-opacity hover:opacity-75 active:opacity-60"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          {isImage && receipt.signedUrl && !imgFailed ? (
            <img
              src={receipt.signedUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : receipt.mimeType === "application/pdf" ? (
            <FileText  size={16} strokeWidth={1.75} style={{ color: "#22C55E"            }} />
          ) : (
            <FileImage size={16} strokeWidth={1.75} style={{ color: "rgba(96,165,250,0.9)" }} />
          )}
        </button>

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
              <span className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin rounded-full border border-white/20 border-t-white/60" />
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
  const inputRef                             = useRef<HTMLInputElement>(null);
  const [receipts,      setReceipts]         = useState<ReceiptRow[]>([]);
  const [loading,       setLoading]          = useState(false);
  const [fetchError,    setFetchError]       = useState(false);
  const [uploading,     setUploading]        = useState(false);
  const [deletingId,    setDeletingId]       = useState<string | null>(null);
  const [paywallOpen,   setPaywallOpen]      = useState(false);
  const [isNative,      setIsNative]         = useState(false);
  const [viewingReceipt, setViewingReceipt]  = useState<ReceiptRow | null>(null);

  // Detect Capacitor iOS shell once on mount
  useEffect(() => {
    import("@/lib/native-upload")
      .then(({ isNativePlatform }) => isNativePlatform())
      .then(setIsNative)
      .catch(() => {});
  }, []);

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

  // Close viewer when drawer closes
  useEffect(() => {
    if (!open) setViewingReceipt(null);
  }, [open]);

  // ── Upload ──────────────────────────────────────────────────────────────────

  function handleUploadClick() { inputRef.current?.click(); }

  async function uploadFile(file: File) {
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await uploadFile(file);
  }

  async function handleNativePhotoUpload() {
    try {
      const { pickPhotoNative } = await import("@/lib/native-upload");
      const file = await pickPhotoNative();
      if (file) await uploadFile(file);
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (msg.includes("cancel") || msg.includes("no image")) return;
      onToast({ type: "error", message: "Could not access camera. Please check permissions in Settings." });
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
    setReceipts((prev) =>
      prev.map((r) => r.id === updated.id ? { ...r, ...updated } : r)
    );
    // Keep viewer in sync if it's showing the updated receipt
    setViewingReceipt((prev) =>
      prev?.id === updated.id ? { ...prev, ...updated } : prev
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
      if (viewingReceipt?.id === id) setViewingReceipt(null);
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

            {isNative ? (
              <div className="flex items-center gap-2 mr-8">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleNativePhotoUpload}
                  disabled={uploading}
                  className="gap-1.5"
                >
                  {uploading ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                  ) : (
                    <Camera size={13} strokeWidth={2} />
                  )}
                  Photo
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleUploadClick}
                  disabled={uploading}
                  className="gap-1.5"
                >
                  <FolderOpen size={13} strokeWidth={2} />
                  File
                </Button>
              </div>
            ) : (
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
            )}
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
                      onView={() => setViewingReceipt(r)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Full-screen receipt viewer — portalled to body so it layers above the Sheet portal */}
      {createPortal(
        <AnimatePresence>
          {viewingReceipt && (
            <ReceiptViewer
              key={viewingReceipt.id}
              receipt={viewingReceipt}
              isNative={isNative}
              onClose={() => setViewingReceipt(null)}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      <ProPaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
}
