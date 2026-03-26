"use client";

import { useState, useEffect } from "react";

const DISMISSED_KEY = "kashio:tester-hint-dismissed";

export function TesterHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(DISMISSED_KEY)) setVisible(true);
    } catch {
      // localStorage unavailable — don't show
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch {}
  }

  if (!visible) return null;

  return (
    <div className="mt-4 flex items-start justify-between gap-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-800/50">
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Testing Kashio? Start with a sample file.
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Download{" "}
          <a href="/samples/clean-sample.csv" download className="underline hover:text-gray-600 dark:hover:text-gray-300">clean-sample.csv</a>
          {" "}for a simple run, or{" "}
          <a href="/samples/mixed-realistic.csv" download className="underline hover:text-gray-600 dark:hover:text-gray-300">mixed-realistic.csv</a>
          {" "}for a fuller mix. Use{" "}
          <a href="/samples/messy-import.csv" download className="underline hover:text-gray-600 dark:hover:text-gray-300">messy-import.csv</a>
          {" "}to test error handling.
        </p>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="mt-0.5 shrink-0 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
      >
        ✕
      </button>
    </div>
  );
}
