"use client";

import { useState, useRef, useEffect } from "react";

export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click/tap
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="More information"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] font-semibold text-gray-400 hover:border-gray-400 hover:text-gray-600 dark:border-gray-600 dark:text-gray-500 dark:hover:border-gray-400 dark:hover:text-gray-300"
      >
        i
      </button>

      {open && (
        <div className="absolute left-6 top-0 z-10 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-md dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{text}</p>
        </div>
      )}
    </div>
  );
}
