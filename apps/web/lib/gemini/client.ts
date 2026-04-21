import "server-only";
import { GoogleGenAI } from "@google/genai";

export const GEMINI_ENABLED = process.env.GEMINI_ENABLED === "true";
export const GEMINI_MODEL   = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

if (GEMINI_ENABLED && !process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY must be set when GEMINI_ENABLED=true");
}

export const gemini = GEMINI_ENABLED
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  : null;
