"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Section } from "@/components/layout/Section";
import { FadeIn } from "@/components/ui/FadeIn";
import { faqs } from "@/content/faqs";
import type { FAQItem } from "@/types";

type Props = {
  items?: FAQItem[];
  heading?: string;
};

export function FAQSection({ items = faqs, heading = "Frequently asked questions" }: Props) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <Section narrow id="faqs">
      <FadeIn>
        <div className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {heading}
          </h2>
        </div>
      </FadeIn>

      <div className="flex flex-col divide-y" style={{ borderColor: "var(--bg-border)" }}>
        {items.map((item, i) => (
          <FadeIn key={i} delay={i * 0.04}>
            <div>
              <button
                className="w-full flex items-start justify-between gap-4 py-5 text-left"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span
                  className="text-base font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.question}
                </span>
                <motion.span
                  animate={{ rotate: open === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  <ChevronDown size={18} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p
                      className="pb-5 text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
