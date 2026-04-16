import { ShieldCheck, Building2, FileCheck, Zap } from "lucide-react";
import { Container } from "@/components/layout/Container";

const SIGNALS = [
  { icon: Building2,   text: "Works with all major Australian banks"     },
  { icon: FileCheck,   text: "ATO-aligned deduction rules"               },
  { icon: ShieldCheck, text: "Your data is never shared or sold"         },
  { icon: Zap,         text: "Scan hundreds of transactions in seconds"  },
];

export function TrustBar() {
  return (
    <div
      className="relative z-10 border-y py-6"
      style={{ borderColor: "var(--bg-border)" }}
    >
      <Container>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {SIGNALS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5">
              <Icon size={15} className="shrink-0" style={{ color: "var(--accent-green)" }} />
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{text}</p>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
