"use client";

import { useState } from "react";

// ── Bank data ─────────────────────────────────────────────────────────────────

type Bank = {
  name:    string;
  initials: string;
  color:   string;
  steps:   string[];
};

const BANKS: Bank[] = [
  {
    name:     "Commonwealth Bank",
    initials: "CBA",
    color:    "#FFD200",
    steps: [
      "Log in to NetBank or the CommBank app",
      "Select your account",
      "Open your transaction history",
      "Look for Export or Download",
      "Choose CSV format",
      "Select your date range and download",
    ],
  },
  {
    name:     "Westpac",
    initials: "WBC",
    color:    "#DA1710",
    steps: [
      "Log in to Westpac Online Banking",
      "Open your account",
      "Go to account activity or transaction history",
      "Click Download transactions",
      "Choose CSV",
      "Select date range and download",
    ],
  },
  {
    name:     "ANZ",
    initials: "ANZ",
    color:    "#007DBA",
    steps: [
      "Log in to ANZ Internet Banking",
      "Open your account",
      "Go to transaction history",
      "Select Export",
      "Choose CSV file",
      "Download the file",
    ],
  },
  {
    name:     "NAB",
    initials: "NAB",
    color:    "#CF001C",
    steps: [
      "Log in to NAB Internet Banking",
      "Select your account",
      "Open transaction history",
      "Click Export",
      "Choose CSV format",
      "Download the file",
    ],
  },
  {
    name:     "ING",
    initials: "ING",
    color:    "#FF6200",
    steps: [
      "Log in to ING Online Banking",
      "Select your account",
      "Open your transactions",
      "Choose Export",
      "Select CSV format",
      "Download the file",
    ],
  },
  {
    name:     "Macquarie",
    initials: "MQG",
    color:    "#000000",
    steps: [
      "Log in to Macquarie Online Banking",
      "Go to your account",
      "Open transactions",
      "Click Download",
      "Choose CSV format",
      "Download the file",
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function BankCsvInstructions() {
  // One bank open at a time — null means all closed
  const [expanded, setExpanded] = useState<string | null>(null);

  function toggle(name: string) {
    setExpanded((prev) => (prev === name ? null : name));
  }

  return (
    <div className="space-y-3">
      {BANKS.map((bank) => {
        const isOpen = expanded === bank.name;

        return (
          <div
            key={bank.name}
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid var(--bg-border)" }}
          >
            {/* Header row — entire row is the toggle button */}
            <button
              type="button"
              onClick={() => toggle(bank.name)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150"
              style={{ backgroundColor: "var(--bg-card)" }}
            >
              {/* Bank initials badge */}
              <div
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: bank.color }}
              >
                <span className="text-[9px] font-bold tracking-tight text-white leading-none">
                  {bank.initials}
                </span>
              </div>

              {/* Bank name */}
              <p
                className="flex-1 text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {bank.name}
              </p>

              {/* Chevron */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
                style={{
                  color:     "var(--text-muted)",
                  transform: isOpen ? "rotate(180deg)" : "none",
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Steps — visible only when expanded */}
            {isOpen && (
              <div
                className="px-4 py-4"
                style={{
                  borderTop:       "1px solid var(--bg-border)",
                  backgroundColor: "var(--bg-card)",
                }}
              >
                <ol className="space-y-2">
                  {bank.steps.map((step, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <span
                        className="shrink-0 tabular-nums"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {i + 1}.
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
