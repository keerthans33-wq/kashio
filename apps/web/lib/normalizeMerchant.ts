// Removes common bank noise from transaction descriptions
// and returns a clean, readable merchant name.
//
// Examples:
//   "AMZN*AB12CD SEATTLE"     → "Amzn"
//   "OFFICEWORKS 0042 SYDNEY"  → "Officeworks"
//   "SQ *COFFEE SHOP"          → "Coffee Shop"
//   "DIRECT DEBIT 123456 RENT" → "Direct Debit Rent"

// Remove card/terminal codes like: *AB12CD, #1234, 0042
const TERMINAL_CODE = /[*#]\s*[A-Z0-9]{3,}/gi;

// Remove standalone sequences of digits (transaction IDs)
const DIGIT_SEQUENCE = /\b\d{3,}\b/g;

// Remove city/state noise appended by banks: " SYDNEY", " NSW", " VIC" etc.
const CITY_STATE = /\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT|SYDNEY|MELBOURNE|BRISBANE|PERTH|ADELAIDE|HOBART|DARWIN|CANBERRA)\b/gi;

// Collapse multiple spaces
const EXTRA_SPACES = /\s{2,}/g;

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeMerchant(description: string): string {
  let result = description;

  result = result.replace(TERMINAL_CODE, " ");
  result = result.replace(DIGIT_SEQUENCE, " ");
  result = result.replace(CITY_STATE, " ");
  result = result.replace(EXTRA_SPACES, " ").trim();
  result = toTitleCase(result);

  return result || description; // fall back to raw if result is empty
}
