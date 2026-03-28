// Maps a raw Basiq transaction into an IngestionRow.
// Thin wrapper around the existing mapBasiqTransaction so the Basiq route
// can use the same ingestion interface as CSV and demo.
//
// Error contract: SILENT DROP — returns null for unmappable transactions.
// The Basiq route filters out nulls and imports only valid rows.
// This differs from the CSV adapter, which fails fast so the user can fix their file.
// Basiq data comes from an external API the user cannot edit, so per-row errors
// are not actionable and would only add noise.

export { mapBasiqTransaction as fromBasiq } from "../basiq/mapTransaction";
export type { MappedTransaction as BasiqIngestionRow } from "../basiq/mapTransaction";
