"use client";

import { useState } from "react";
import { addWfhEntry } from "./actions";

export function WfhForm() {
  const today = new Date().toLocaleDateString("en-CA");

  const [date,       setDate]       = useState(today);
  const [hours,      setHours]      = useState("");
  const [note,       setNote]       = useState("");
  const [saving,     setSaving]     = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [dateError,  setDateError]  = useState<string | null>(null);
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [saveError,  setSaveError]  = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDateError(null); setHoursError(null); setSaveError(null); setSuccess(false);

    let valid = true;
    if (!date) { setDateError("Date is required."); valid = false; }
    const h = parseFloat(hours);
    if (!hours.trim()) { setHoursError("Hours are required."); valid = false; }
    else if (isNaN(h) || h <= 0) { setHoursError("Enter a number greater than 0."); valid = false; }
    else if (h > 16) { setHoursError("Hours can't exceed 16 in a single day."); valid = false; }
    if (!valid) return;

    setSaving(true);
    try {
      const result = await addWfhEntry(date, h, note.trim());
      if (result?.error) { setSaveError(result.error); }
      else { setHours(""); setNote(""); setSuccess(true); }
    } catch {
      setSaveError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "h-11 w-full rounded-xl px-3 text-sm focus:outline-none focus:ring-1 transition-colors";
  const inputStyle = {
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--bg-border)",
    color: "var(--text-primary)",
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="wfh-date" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Date
          </label>
          <input
            id="wfh-date"
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setDateError(null); setSuccess(false); }}
            className={inputClass}
            style={{ ...inputStyle, borderColor: dateError ? "#EF4444" : "var(--bg-border)" }}
          />
          {dateError && <p className="mt-1 text-xs text-red-400">{dateError}</p>}
        </div>
        <div>
          <label htmlFor="wfh-hours" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Hours
          </label>
          <input
            id="wfh-hours"
            type="number"
            min="0.5"
            max="16"
            step="0.5"
            placeholder="e.g. 8"
            value={hours}
            onChange={(e) => { setHours(e.target.value); setHoursError(null); setSuccess(false); }}
            className={inputClass}
            style={{ ...inputStyle, borderColor: hoursError ? "#EF4444" : "var(--bg-border)" }}
          />
          {hoursError && <p className="mt-1 text-xs text-red-400">{hoursError}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="wfh-note" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          Note <span className="font-normal" style={{ color: "var(--text-muted)" }}>(optional)</span>
        </label>
        <input
          id="wfh-note"
          type="text"
          placeholder="e.g. Full day, video calls"
          value={note}
          onChange={(e) => { setNote(e.target.value); setSuccess(false); }}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {saveError && <p className="text-sm text-red-400">{saveError}</p>}
      {success && <p className="text-sm" style={{ color: "#22C55E" }}>Entry saved.</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl py-3.5 text-[15px] font-semibold text-white transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
        style={{ background: "linear-gradient(to right, var(--violet-from), var(--violet-to))" }}
      >
        {saving ? "Saving…" : "Add entry"}
      </button>
    </form>
  );
}
