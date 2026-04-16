import type { FAQItem } from "@/types";

export const faqs: FAQItem[] = [
  {
    question: "How does Kashio find deductions?",
    answer:
      "Kashio uses a rules-based engine that scans your imported transactions, matches merchants and keywords against known deduction categories, and flags anything that may be claimable. Each suggestion includes a plain-English explanation so you understand why it was flagged.",
  },
  {
    question: "Is Kashio a tax adviser?",
    answer:
      "No. Kashio is a tool to help you identify and organise potential deductions — it does not provide tax advice. All suggestions are automatically generated based on general ATO guidelines. Always verify your deductions with a registered tax agent or accountant before lodging.",
  },
  {
    question: "Who is Kashio for?",
    answer:
      "Kashio is built for Australian employees, contractors, and sole traders. The deduction suggestions and explanations are tailored to your user type — an employee claiming work expenses sees different guidance than a sole trader claiming business expenses.",
  },
  {
    question: "How do I import my transactions?",
    answer:
      "You can upload a bank statement CSV from most Australian banks. Kashio detects column formats automatically, so you rarely need to map columns manually. Bank connection (Open Banking) is also available for supported institutions.",
  },
  {
    question: "Which banks are supported?",
    answer:
      "CSV imports work with any bank that lets you export statements in CSV format — most Australian banks do. Open Banking connections currently support a growing list of major institutions.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. Your transaction data is stored securely and never shared with third parties. Kashio only processes the minimum data needed to identify potential deductions. You can delete your data at any time.",
  },
  {
    question: "What does the export include?",
    answer:
      "The export is a clean, formatted tax summary showing your confirmed deductions by category, total amounts, and any evidence notes you added during review. It's designed to be easy to hand to your accountant.",
  },
  {
    question: "What is work from home tracking?",
    answer:
      "Kashio includes a WFH hour logger that helps you calculate your potential working from home deduction. You log the days you worked from home, and Kashio calculates the deductible amount based on the ATO's fixed-rate method.",
  },
  {
    question: "Is Kashio free?",
    answer:
      "Importing transactions, reviewing deductions, and tracking WFH hours are free. Exporting your final tax summary is a premium feature — see the pricing page for details.",
  },
];
