import "server-only";
import Stripe from "stripe";

// Initialised with an empty string at build time when the env var is absent.
// Any actual API call without a real key will fail at runtime with a clear Stripe error.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-03-25.dahlia",
});
