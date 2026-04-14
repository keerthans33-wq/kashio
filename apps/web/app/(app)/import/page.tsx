import CsvUploader from "../../components/import/CsvUploader";

export default function Import() {
  return (
    <main className="mx-auto max-w-[480px] px-5 py-12 sm:py-16" style={{ backgroundColor: "var(--bg-app)" }}>

      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-[28px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
          Import your bank transactions
        </h1>
        <p className="mt-2 text-[15px]" style={{ color: "var(--text-muted)" }}>
          Takes less than 30 seconds. Your data stays private.
        </p>
      </div>

      {/* Primary: CSV upload */}
      <CsvUploader />

      {/* Divider */}
      <div className="my-8 flex items-center gap-4">
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--bg-elevated)" }} />
        <span className="text-xs font-medium tracking-wide" style={{ color: "var(--text-muted)" }}>OR</span>
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--bg-elevated)" }} />
      </div>

      {/* Coming soon: bank connection */}
      <div
        className="rounded-2xl px-5 py-5"
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-elevated)", opacity: 0.65 }}
      >
        <p className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
          Connect your bank
        </p>
        <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Automatically import your transactions securely using Open Banking. Coming soon.
        </p>
        <button
          disabled
          className="mt-4 w-full rounded-xl py-3 text-sm font-semibold cursor-not-allowed select-none"
          style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}
        >
          Coming soon
        </button>
      </div>

      {/* Trust notes */}
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8">
        {[
          "Your data is encrypted",
          "Built for Australians",
          "We never store your banking passwords",
        ].map((point) => (
          <p key={point} className="text-xs text-center" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
            {point}
          </p>
        ))}
      </div>

    </main>
  );
}
