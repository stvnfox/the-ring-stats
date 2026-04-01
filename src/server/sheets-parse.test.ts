import { describe, expect, it } from "vitest";

import {
	parseMapScores,
	parseTeamScores,
	parseTopFraggers,
	parseTournamentState,
	splitStackedArchiveValues,
} from "#/server/sheets-parse";

describe("parseTournamentState", () => {
	const earlyApril2026 = new Date("2026-04-01T12:00:00Z");

	it("returns false when there are no data rows", () => {
		expect(parseTournamentState(["status"], [[]])).toEqual({
			hasPlannedTournament: false,
			isInFuture: false,
		});
	});

	it("treats active status as planned", () => {
		expect(
			parseTournamentState(["status", "name"], [["upcoming", "Spring Cup"]]),
		).toEqual({
			hasPlannedTournament: true,
			tournamentLabel: "Spring Cup",
			isInFuture: false,
		});
	});

	it("reads date column on the display row", () => {
		expect(
			parseTournamentState(
				["status", "name", "date"],
				[["upcoming", "Spring Cup", "12-04-2026"]],
				{ now: earlyApril2026 },
			),
		).toEqual({
			hasPlannedTournament: true,
			tournamentLabel: "Spring Cup",
			tournamentDate: "12-04-2026",
			isInFuture: true,
		});
	});

	it("prefers live over earlier upcoming for hero row", () => {
		expect(
			parseTournamentState(
				["status", "name"],
				[
					["upcoming", "Old Cup"],
					["live", "Summer Clash"],
				],
			),
		).toEqual({
			hasPlannedTournament: true,
			tournamentLabel: "Summer Clash",
			isInFuture: false,
		});
	});

	it("prefers Current = yes over status order", () => {
		expect(
			parseTournamentState(
				["status", "name", "current"],
				[
					["live", "Alpha", ""],
					["upcoming", "Bravo", "yes"],
				],
			),
		).toEqual({
			hasPlannedTournament: true,
			tournamentLabel: "Bravo",
			isInFuture: false,
		});
	});

	it("ignores completed-only rows", () => {
		expect(
			parseTournamentState(["status"], [["completed"], ["cancelled"]]),
		).toEqual({
			hasPlannedTournament: false,
			isInFuture: false,
		});
	});

	const mid2026 = new Date("2026-06-01T12:00:00Z");

	it("hides home dashboard when the only open row has a start date before today (Europe/Amsterdam)", () => {
		expect(
			parseTournamentState(
				["status", "name", "date"],
				[["upcoming", "Old Cup", "31-05-2026"]],
				{ now: mid2026 },
			),
		).toEqual({ hasPlannedTournament: false, isInFuture: false });
	});

	it("shows future-dated tournaments on the home dashboard", () => {
		expect(
			parseTournamentState(
				["status", "name", "date"],
				[["upcoming", "Next Cup", "15-06-2026"]],
				{ now: mid2026 },
			),
		).toEqual({
			hasPlannedTournament: true,
			tournamentLabel: "Next Cup",
			tournamentDate: "15-06-2026",
			isInFuture: true,
		});
	});

	it("still shows live rows when the start date is in the past", () => {
		expect(
			parseTournamentState(
				["status", "name", "date"],
				[["live", "Winter LAN", "01-12-2025"]],
				{ now: mid2026 },
			),
		).toEqual({
			hasPlannedTournament: true,
			tournamentLabel: "Winter LAN",
			tournamentDate: "01-12-2025",
			isInFuture: false,
		});
	});

	it("does not show a past-dated row when Current = yes (often left on after the event)", () => {
		expect(
			parseTournamentState(
				["status", "name", "date", "current"],
				[["upcoming", "Legacy", "01-06-2025", "yes"]],
				{ now: mid2026 },
			),
		).toEqual({ hasPlannedTournament: false, isInFuture: false });
	});

	it("picks a future row when an older upcoming row is past-dated", () => {
		expect(
			parseTournamentState(
				["status", "name", "date"],
				[
					["upcoming", "Stale", "01-01-2026"],
					["upcoming", "Fresh", "01-09-2026"],
				],
				{ now: mid2026 },
			),
		).toEqual({
			hasPlannedTournament: true,
			tournamentLabel: "Fresh",
			tournamentDate: "01-09-2026",
			isInFuture: true,
		});
	});

	it("uses Amsterdam calendar day so late UTC evening can already be the next NL day", () => {
		// May 31 23:30 UTC = June 1 01:30 CEST — event 2026-05-31 is “yesterday” in NL
		const now = new Date("2026-05-31T23:30:00.000Z");
		expect(
			parseTournamentState(
				["status", "name", "date"],
				[["upcoming", "May 31 event", "31-05-2026"]],
				{ now },
			),
		).toEqual({ hasPlannedTournament: false, isInFuture: false });
	});

	it("parses DD-MM-YYYY for past vs today (Amsterdam)", () => {
		expect(
			parseTournamentState(
				["status", "name", "date"],
				[["upcoming", "Dutch fmt", "31-05-2026"]],
				{ now: mid2026 },
			),
		).toEqual({ hasPlannedTournament: false, isInFuture: false });
	});

	it("parses DD-MM-YYYY for strictly future (Amsterdam)", () => {
		expect(
			parseTournamentState(
				["status", "name", "date"],
				[["upcoming", "Dutch fmt", "15-06-2026"]],
				{ now: mid2026 },
			),
		).toEqual({
			hasPlannedTournament: true,
			tournamentLabel: "Dutch fmt",
			tournamentDate: "15-06-2026",
			isInFuture: true,
		});
	});

	it("treats DD-MM-YYYY on the same NL calendar day as not past and not isInFuture", () => {
		expect(
			parseTournamentState(
				["status", "name", "date"],
				[["upcoming", "Today cup", "01-06-2026"]],
				{ now: mid2026 },
			),
		).toEqual({
			hasPlannedTournament: true,
			tournamentLabel: "Today cup",
			tournamentDate: "01-06-2026",
			isInFuture: false,
		});
	});
});

describe("parseMapScores", () => {
	it("parses long Map / Team / Score rows", () => {
		const values = [
			["Map", "Team", "Score"],
			["Inferno", "Alpha", "16"],
			["Inferno", "Beta", "12"],
			["Mirage", "Alpha", "13"],
			["Mirage", "Beta", "16"],
		];
		const blocks = parseMapScores(values);
		expect(blocks.map((b) => b.mapName)).toEqual(["Inferno", "Mirage"]);
		const inferno = blocks.find((b) => b.mapName === "Inferno");
		expect(inferno?.teams[0]?.teamName).toBe("Alpha");
		expect(inferno?.teams[0]?.total).toBe(16);
	});

	it("parses Map / Team / Player / Score rows", () => {
		const values = [
			["Map", "Team", "Player", "Score"],
			["Inferno", "Alpha", "p1", "10"],
			["Inferno", "Alpha", "p2", "6"],
			["Inferno", "Beta", "p1", "8"],
		];
		const blocks = parseMapScores(values);
		const inferno = blocks.find((b) => b.mapName === "Inferno");
		const alpha = inferno?.teams.find((t) => t.teamName === "Alpha");
		expect(alpha?.playerScores).toHaveLength(2);
		expect(alpha?.total).toBe(16);
	});

	it("parses wide grid with map names in column A", () => {
		const values = [
			["Map", "Alpha", "Beta"],
			["Inferno", "16", "12"],
			["Mirage", "13", "16"],
		];
		const blocks = parseMapScores(values);
		expect(blocks).toHaveLength(2);
		expect(blocks[0]?.mapName).toBe("Inferno");
		expect(blocks[0]?.teams[0]).toMatchObject({
			placement: 1,
			teamName: "Alpha",
			total: 16,
		});
	});

	it("parses Discord-style MapScores row (Team, Map, Player1, P1Kills, …)", () => {
		const values = [
			[
				"Team",
				"Map",
				"Placement",
				"TotalKills",
				"TeamScore",
				"Player1",
				"P1Kills",
				"Player2",
				"P2Kills",
				"Player3",
				"P3Kills",
			],
			["Lagoon", "Inferno", "1", "40", "16", "vex", "24", "nio", "16", "", ""],
			["Reef", "Inferno", "2", "28", "12", "ora", "16", "flux", "12", "", ""],
		];
		const blocks = parseMapScores(values);
		expect(blocks).toHaveLength(1);
		expect(blocks[0]?.mapName).toBe("Inferno");
		expect(blocks[0]?.teams[0]?.teamName).toBe("Lagoon");
		expect(blocks[0]?.teams[0]?.placement).toBe(1);
		expect(blocks[0]?.teams[0]?.total).toBe(16);
		expect(blocks[0]?.teams[0]?.playerScores).toHaveLength(2);
	});
});

describe("parseTeamScores", () => {
	it("reads TotalScore and MatchPoint flag", () => {
		const values = [
			["Team", "TotalScore", "MatchPoint"],
			["Alpha", "100", "1"],
			["Beta", "90", ""],
		];
		const rows = parseTeamScores(values);
		expect(rows[0]).toMatchObject({
			rank: 1,
			name: "Alpha",
			score: 100,
			onMatchPoint: true,
		});
		expect(rows[1]).toMatchObject({
			rank: 2,
			name: "Beta",
			score: 90,
			onMatchPoint: false,
		});
	});

	it("parses European decimal comma in TotalScore (43,2 not 432)", () => {
		const values = [
			["Team", "TotalScore", "MatchPoint"],
			["Alpha", "43,2", ""],
			["Beta", "42,1", ""],
		];
		const rows = parseTeamScores(values);
		expect(rows[0]).toMatchObject({ rank: 1, name: "Alpha", score: 43.2 });
		expect(rows[1]).toMatchObject({ rank: 2, name: "Beta", score: 42.1 });
	});
});

describe("splitStackedArchiveValues", () => {
	it("reads meta rows and three sections for existing parsers", () => {
		const grid = [
			["EventName", "Spring Cup"],
			["EventDate", "2026-01-01"],
			["__PlayerTotals__"],
			["Player", "TotalKills"],
			["vex", "10"],
			["__TeamTotals__"],
			["Team", "TotalScore", "MatchPoint"],
			["Alpha", "100", ""],
			["__MapScores__"],
			["Map", "Team", "Score"],
			["M1", "Alpha", "16"],
		];
		const s = splitStackedArchiveValues(grid);
		expect(s.eventLabel).toBe("Spring Cup");
		expect(s.eventDate).toBe("2026-01-01");
		expect(parseTopFraggers(s.players)).toHaveLength(1);
		expect(parseTeamScores(s.teams)[0]?.name).toBe("Alpha");
		expect(parseMapScores(s.maps).length).toBe(1);
	});
});
