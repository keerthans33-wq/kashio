import { ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/Container";

export function TrustBar() {
  return (
    <div
      className="relative z-10 border-y py-5"
      style={{ borderColor: "var(--bg-border)" }}
    >
      <Container>
        <div className="flex items-center justify-center gap-2.5 text-center">
          <ShieldCheck size={16} style={{ color: "var(--accent-green)", flexShrink: 0 }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Kashio is not a tax adviser. All suggestions are automatically generated — always verify with your accountant before lodging.
          </p>
        </div>
      </Container>
    </div>
  );
}
