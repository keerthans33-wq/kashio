// ATO fixed-rate method: 67c per hour worked from home
const WFH_RATE = 0.67;

export interface WfhEntry {
  date:  string; // YYYY-MM-DD
  hours: number;
}

export interface WfhSummary {
  monthHours: number;
  monthEst:   number;
  ytdHours:   number;
  ytdEst:     number;
  /** e.g. "April 2026" */
  monthName:  string;
  /** e.g. "FY25–26" */
  fyLabel:    string;
}

export function calcWfhSummary(entries: WfhEntry[], now = new Date()): WfhSummary {
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthName   = now.toLocaleString("en-AU", { month: "long", year: "numeric" });

  // Australian financial year: 1 Jul – 30 Jun
  const fyStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const fyStart     = `${fyStartYear}-07-01`;
  const fyEnd       = `${fyStartYear + 1}-06-30`;
  const fyLabel     = `FY${String(fyStartYear).slice(2)}–${String(fyStartYear + 1).slice(2)}`;

  const monthHours = entries
    .filter((e) => e.date.startsWith(monthPrefix))
    .reduce((s, e) => s + e.hours, 0);

  const ytdHours = entries
    .filter((e) => e.date >= fyStart && e.date <= fyEnd)
    .reduce((s, e) => s + e.hours, 0);

  return {
    monthHours,
    monthEst:  monthHours * WFH_RATE,
    ytdHours,
    ytdEst:    ytdHours  * WFH_RATE,
    monthName,
    fyLabel,
  };
}
