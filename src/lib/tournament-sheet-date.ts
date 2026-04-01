/**
 * Tournament tab / archive: **day-first** dates (**DD-MM-YYYY**, **DD/MM/YYYY**, **DD.MM.YYYY**).
 * Sheets often serializes dates with `/` or `.`; we never treat those as US M/D/Y.
 * Also accepts **YYYY-MM-DD** prefix; callers may fall back to `Date.parse` only when safe.
 */

export type TournamentSheetYmd = { y: number; m: number; d: number };

export function isValidCalendarYmd(ymd: TournamentSheetYmd): boolean {
	const dt = new Date(ymd.y, ymd.m - 1, ymd.d);
	return (
		dt.getFullYear() === ymd.y &&
		dt.getMonth() === ymd.m - 1 &&
		dt.getDate() === ymd.d
	);
}

/**
 * Parse sheet cell to calendar Y-M-D.
 * - **DD-MM-YYYY**, **DD/MM/YYYY**, **DD.MM.YYYY** (day first — matches NL sheets and Sheets API locale strings)
 * - **YYYY-MM-DD** prefix (ISO)
 *
 * Google Sheets often returns `4/7/2026`-style strings; `Date.parse` treats those as US M/D/Y, so we parse explicitly.
 */
export function parseTournamentSheetDateToYmd(raw: string): TournamentSheetYmd | null {
	const s = raw.trim();
	const dmySep = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s);
	if (dmySep?.[1] && dmySep[2] && dmySep[3]) {
		const ymd: TournamentSheetYmd = {
			y: Number(dmySep[3]),
			m: Number(dmySep[2]),
			d: Number(dmySep[1]),
		};
		return isValidCalendarYmd(ymd) ? ymd : null;
	}
	const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
	if (iso?.[1] && iso[2] && iso[3]) {
		const ymd: TournamentSheetYmd = {
			y: Number(iso[1]),
			m: Number(iso[2]),
			d: Number(iso[3]),
		};
		return isValidCalendarYmd(ymd) ? ymd : null;
	}
	return null;
}
