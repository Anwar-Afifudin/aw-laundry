import type { ReportDateRange, ReportPreset } from "./types";

const jakartaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
function dateValue(date: Date) { return jakartaDate.format(date); }
function addDays(value: string, days: number) { const date = new Date(`${value}T12:00:00+07:00`); date.setUTCDate(date.getUTCDate() + days); return dateValue(date); }
function monthStart(value: string) { return `${value.slice(0, 7)}-01`; }
function previousMonthStart(value: string) { const date = new Date(`${monthStart(value)}T12:00:00+07:00`); date.setUTCMonth(date.getUTCMonth() - 1); return dateValue(date).slice(0, 7) + "-01"; }
export function createReportRange(startDate: string, endDate: string): ReportDateRange { return { startDate, endDate, startIso: `${startDate}T00:00:00+07:00`, endExclusiveIso: `${addDays(endDate, 1)}T00:00:00+07:00` }; }
export function getPresetRange(preset: Exclude<ReportPreset, "CUSTOM">, now = new Date()): ReportDateRange {
  const today = dateValue(now);
  if (preset === "TODAY") return createReportRange(today, today);
  if (preset === "LAST_7_DAYS") return createReportRange(addDays(today, -6), today);
  if (preset === "LAST_30_DAYS") return createReportRange(addDays(today, -29), today);
  if (preset === "THIS_MONTH") return createReportRange(monthStart(today), today);
  const start = previousMonthStart(today); return createReportRange(start, addDays(monthStart(today), -1));
}
