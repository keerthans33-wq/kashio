// Maps a raw Basiq transaction into an IngestionRow.
// Thin wrapper around the existing mapBasiqTransaction so the Basiq route
// can use the same ingestion interface as CSV and demo.

export { mapBasiqTransaction as fromBasiq } from "../basiq/mapTransaction";
export type { MappedTransaction as BasiqIngestionRow } from "../basiq/mapTransaction";
