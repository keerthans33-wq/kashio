"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, FileText, Shield, HelpCircle, Mail, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { useRevenueCat } from "@/components/providers/RevenueCatProvider";
import { supabase } from "@/lib/supabase";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

type ModalStep = "warn" | "type";

export default function SettingsPage() {
  const { user } = useUser();
  const { isIOS, restore } = useRevenueCat();

  const [modal,           setModal]           = useState<ModalStep | null>(null);
  const [confirmText,     setConfirmText]     = useState("");
  const [deleting,        setDeleting]        = useState(false);
  const [deleteError,     setDeleteError]     = useState<string | null>(null);
  const [restoring,       setRestoring]       = useState(false);
  const [restoreMessage,  setRestoreMessage]  = useState<{ text: string; ok: boolean } | null>(null);

  function openDeleteModal() {
    setModal("warn");
    setConfirmText("");
    setDeleteError(null);
  }

  function closeModal() {
    if (deleting) return;
    setModal(null);
    setConfirmText("");
    setDeleteError(null);
  }

  async function handleRestorePurchases() {
    if (restoring) return;
    if (!navigator.onLine) {
      setRestoreMessage({ text: "You're offline. Connect to the internet to restore purchases.", ok: false });
      return;
    }
    setRestoring(true);
    setRestoreMessage(null);
    try {
      const ok = await restore();
      setRestoreMessage({ text: ok ? "Purchases restored successfully." : "No active subscription found.", ok });
    } catch (e) {
      console.error("Restore failed:", e);
      setRestoreMessage({ text: "Could not restore purchases. Please try again.", ok: false });
    } finally {
      setRestoring(false);
    }
  }

  async function handleDelete() {
    if (confirmText !== "DELETE" || deleting) return;
    if (!navigator.onLine) {
      setDeleteError("You're offline. Connect to the internet to delete your account.");
      return;
    }
    setDeleting(true);
    setDeleteError(null);

    try {
      const res  = await fetchWithTimeout("/api/account/delete", { method: "DELETE", timeoutMs: 30_000 });
      const json = await res.json() as { ok?: boolean; error?: string };

      if (!res.ok) {
        setDeleteError(json.error ?? "Deletion failed. Contact support@kashio.com.au.");
        setDeleting(false);
        return;
      }

      // Clear local session then bounce to login.
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setDeleteError(
        msg.includes("offline") || msg.includes("network")
          ? "You're offline. Connect to the internet and try again."
          : msg.includes("timed out")
          ? "Request timed out. Check your connection and try again."
          : "Network error. Please try again."
      );
      setDeleting(false);
    }
  }

  return (
    <main className="relative z-10 min-h-screen px-5 py-10 sm:py-16" style={{ color: "var(--text-primary)" }}>
      <div className="mx-auto max-w-lg">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[24px] font-bold tracking-tight">Settings</h1>
          {user?.email && (
            <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>{user.email}</p>
          )}
        </div>

        <div className="space-y-4">

          {/* Legal */}
          <Section label="Legal">
            <SettingsRow icon={<Shield size={15} />}   label="Privacy Policy" href="/privacy" />
            <SettingsRow icon={<FileText size={15} />} label="Terms of Use"   href="/terms" />
          </Section>

          {/* Support */}
          <Section label="Support">
            <SettingsRow icon={<HelpCircle size={15} />} label="Help & FAQ"   href="/support" />
            <SettingsRow icon={<Mail size={15} />}       label="Contact us"   href="mailto:support@kashio.com.au" external />
          </Section>

          {/* Subscription */}
          {isIOS && (
            <Section label="Subscription">
              <button
                onClick={handleRestorePurchases}
                disabled={restoring}
                className="w-full flex items-center gap-3 px-4 py-3.5 transition-opacity hover:opacity-70 disabled:opacity-60"
              >
                <span
                  className="flex items-center justify-center rounded-lg w-7 h-7 shrink-0"
                  style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E" }}
                >
                  {restoring
                    ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#22C55E]/30 border-t-[#22C55E]" />
                    : <RefreshCw size={15} />
                  }
                </span>
                <span className="flex-1 text-left text-[14px]" style={{ color: "var(--text-primary)" }}>
                  {restoring ? "Restoring purchases…" : "Restore purchases"}
                </span>
              </button>
              {restoreMessage && (
                <div
                  className="px-4 pb-3.5 pt-0"
                >
                  <p
                    className="text-[12px] rounded-lg px-3 py-2"
                    style={{
                      backgroundColor: restoreMessage.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                      color:           restoreMessage.ok ? "#22C55E" : "#ef4444",
                    }}
                  >
                    {restoreMessage.text}
                  </p>
                </div>
              )}
            </Section>
          )}

          {/* ── Danger zone ── */}
          <div className="pt-4">
            <p
              className="text-[11px] font-semibold uppercase tracking-widest px-1 mb-2"
              style={{ color: "rgba(239,68,68,0.55)" }}
            >
              Danger zone
            </p>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(239,68,68,0.20)", backgroundColor: "rgba(239,68,68,0.04)" }}
            >
              <button
                onClick={openDeleteModal}
                className="w-full flex items-center gap-3 px-4 py-3.5 transition-opacity hover:opacity-70"
              >
                <span
                  className="flex items-center justify-center rounded-lg w-7 h-7 shrink-0"
                  style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                >
                  <Trash2 size={15} />
                </span>
                <span className="flex-1 text-left text-[14px] font-medium" style={{ color: "#ef4444" }}>
                  Delete account
                </span>
              </button>
            </div>
          </div>

        </div>

        <p className="mt-10 text-center text-[11px]" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
          Kashio · Australian tax deduction tracker
        </p>

      </div>

      {/* ── Delete account modal ── */}
      <AnimatePresence>
        {modal !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50"
              style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
              onClick={closeModal}
            />

            {/* Centering wrapper — pointer-events-none lets backdrop clicks close the modal */}
            <div
              className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
            <motion.div
              key="sheet"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="rounded-2xl p-6"
                style={{
                  backgroundColor: "#0d1117",
                  border: "1px solid rgba(255,255,255,0.09)",
                  boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
                }}
              >
                {modal === "warn" && (
                  <WarnStep
                    onCancel={closeModal}
                    onContinue={() => setModal("type")}
                  />
                )}

                {modal === "type" && (
                  <TypeStep
                    confirmText={confirmText}
                    setConfirmText={setConfirmText}
                    deleting={deleting}
                    error={deleteError}
                    onCancel={closeModal}
                    onDelete={handleDelete}
                  />
                )}
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

    </main>
  );
}

// ── Step 1: warning ─────────────────────────────────────────────────────────

function WarnStep({ onCancel, onContinue }: { onCancel: () => void; onContinue: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span
          className="flex items-center justify-center rounded-xl w-10 h-10 shrink-0"
          style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}
        >
          <AlertTriangle size={18} />
        </span>
        <div>
          <p className="text-[15px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Delete account
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            This will permanently delete your Kashio account, transactions, receipts, and saved reports.
            <strong style={{ color: "var(--text-primary)" }}> This action cannot be undone.</strong>
          </p>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl py-2.5 text-[13px] font-medium transition-opacity hover:opacity-70"
          style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "var(--text-primary)" }}
        >
          Cancel
        </button>
        <button
          onClick={onContinue}
          className="flex-1 rounded-xl py-2.5 text-[13px] font-medium transition-opacity hover:opacity-70"
          style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ── Step 2: type DELETE confirmation ────────────────────────────────────────

function TypeStep({
  confirmText,
  setConfirmText,
  deleting,
  error,
  onCancel,
  onDelete,
}: {
  confirmText:    string;
  setConfirmText: (v: string) => void;
  deleting:       boolean;
  error:          string | null;
  onCancel:       () => void;
  onDelete:       () => void;
}) {
  const ready = confirmText === "DELETE";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[15px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Final confirmation
        </p>
        <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
          Type <strong style={{ color: "var(--text-primary)", letterSpacing: "0.05em" }}>DELETE</strong> to confirm.
        </p>
      </div>

      <input
        type="text"
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="DELETE"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && ready) onDelete(); }}
        disabled={deleting}
        className="w-full rounded-xl px-4 py-3 text-[14px] font-mono tracking-widest transition-colors focus:outline-none focus:ring-1 focus:ring-red-500"
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          border:          ready ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.10)",
          color:           ready ? "#ef4444" : "var(--text-primary)",
        }}
      />

      {error && (
        <p className="text-[12px] text-red-400 leading-relaxed">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={deleting}
          className="flex-1 rounded-xl py-2.5 text-[13px] font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
          style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "var(--text-primary)" }}
        >
          Cancel
        </button>
        <button
          onClick={onDelete}
          disabled={!ready || deleting}
          className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-all disabled:opacity-30"
          style={{
            backgroundColor: ready && !deleting ? "#ef4444" : "rgba(239,68,68,0.25)",
            color:           "#fff",
          }}
        >
          {deleting ? "Deleting…" : "Delete my account"}
        </button>
      </div>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="text-[11px] font-semibold uppercase tracking-widest px-1 mb-2"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <div
        className="rounded-2xl overflow-hidden divide-y"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--bg-border)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  href,
  external,
}: {
  icon:      React.ReactNode;
  label:     string;
  href:      string;
  external?: boolean;
}) {
  const content = (
    <>
      <span
        className="flex items-center justify-center rounded-lg w-7 h-7 shrink-0"
        style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E" }}
      >
        {icon}
      </span>
      <span className="flex-1 text-[14px]" style={{ color: "var(--text-primary)" }}>
        {label}
      </span>
      <ChevronRight size={14} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
    </>
  );

  const cls = "flex items-center gap-3 px-4 py-3.5 transition-opacity hover:opacity-70";

  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}
