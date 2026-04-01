import { describe, expect, it } from "vitest";

import { parseTournamentSheetDateToYmd } from "#/lib/tournament-sheet-date";

describe("parseTournamentSheetDateToYmd", () => {
	it("parses DD-MM-YYYY (sheet format)", () => {
		expect(parseTournamentSheetDateToYmd("15-06-2026")).toEqual({
			y: 2026,
			m: 6,
			d: 15,
		});
		expect(parseTournamentSheetDateToYmd("1-2-2026")).toEqual({
			y: 2026,
			m: 2,
			d: 1,
		});
		expect(parseTournamentSheetDateToYmd("07-04-2026")).toEqual({
			y: 2026,
			m: 4,
			d: 7,
		});
	});

	it("parses DD/MM/YYYY and DD.MM.YYYY (common Sheets API / locale display)", () => {
		expect(parseTournamentSheetDateToYmd("07/04/2026")).toEqual({
			y: 2026,
			m: 4,
			d: 7,
		});
		expect(parseTournamentSheetDateToYmd("7.4.2026")).toEqual({
			y: 2026,
			m: 4,
			d: 7,
		});
	});

	it("accepts YYYY-MM-DD prefix for compatibility", () => {
		expect(parseTournamentSheetDateToYmd("2026-06-15")).toEqual({
			y: 2026,
			m: 6,
			d: 15,
		});
		expect(parseTournamentSheetDateToYmd("2026-06-15T12:00:00Z")).toEqual({
			y: 2026,
			m: 6,
			d: 15,
		});
	});

	it("returns null for invalid calendar dates", () => {
		expect(parseTournamentSheetDateToYmd("31-02-2026")).toBeNull();
		expect(parseTournamentSheetDateToYmd("")).toBeNull();
		expect(parseTournamentSheetDateToYmd("nope")).toBeNull();
	});
});
