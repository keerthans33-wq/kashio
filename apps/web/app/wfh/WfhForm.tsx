"use client";

import { useState } from "react";
import { addWfhEntry } from "./actions";

export function WfhForm() {
  // en-CA locale gives YYYY-MM-DD in local time, avoiding UTC midnight drift
  const today = new Date().toLocaleDateString("en-CA");

  const [date,    setDate]    = useState(today);
  const [hours,   setHours]   = useState("");
  const [note,    setNote]    = useState("");
  const [saving,     setSaving]     = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [dateError,  setDateError]  = useState<string | null>(null);
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [saveError,  setSaveError]  = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDateError(null);
    setHoursError(null);
    setSaveError(null);
    setSuccess(false);

    let valid = true;

    if (!date) {
      setDateError("Date is required.");
      valid = false;
    }

    const h = parseFloat(hours);
    if (!hours.trim()) {
      setHoursError("Hours are required.");
      valid = false;
    } else if (isNaN(h) || h <= 0) {
      setHoursError("Enter a number greater than 0.");
      valid = false;
    } else if (h > 16) {
      setHoursError("Hours can't exceed 16 in a single day.");
      valid = false;
    }

    if (!valid) return;

    setSaving(true);
    try {
      const result = await addWfhEntry(date, h, note.trim());
      if (result?.error) {
        setSaveError(result.error);
      } else {
        setHours("");
        setNote("");
        setSuccess(true);
      }
    } catch {
      setSaveError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="wfh-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date
          </label>
          <input
            id="wfh-date"
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setDateError(null); setSuccess(false); }}
            className={`w-full rounded-md border bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 ${dateError ? "border-red-400 dark:border-red-500" : "border-gray-300 dark:border-gray-600"}`}
          />
          {dateError && <p className="mt-1 text-xs text-red-500">{dateError}</p>}
        </div>
        <div>
          <label htmlFor="wfh-hours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            className={`w-full rounded-md border bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 ${hoursError ? "border-red-400 dark:border-red-500" : "border-gray-300 dark:border-gray-600"}`}
          />
          {hoursError && <p className="mt-1 text-xs text-red-500">{hoursError}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="wfh-note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Note <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          id="wfh-note"
          type="text"
          placeholder="e.g. Full day, video calls"
          value={note}
          onChange={(e) => { setNote(e.target.value); setSuccess(false); }}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {saveError && <p className="text-sm text-red-500">{saveError}</p>}
      {success && <p className="text-sm text-green-600 dark:text-green-400">Entry saved.</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-violet-500"
      >
        {saving ? "Saving…" : "Add entry"}
      </button>
    </form>
  );
}
