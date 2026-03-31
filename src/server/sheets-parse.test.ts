import { describe, expect, it } from "vitest";

import {
	parseMapScores,
	parseTeamScores,
	parseTournamentState,
} from "#/server/sheets-parse";

describe("parseTournamentState", () => {
	it("returns false when there are no data rows", () => {
		expect(parseTournamentState(["status"], [[]])).toEqual({
			hasPlannedTournament: false,
		});
	});

	it("treats active status as planned", () => {
		expect(
			parseTournamentState(["status", "name"], [["upcoming", "Spring Cup"]]),
		).toEqual({
			hasPlannedTournament: true,
			tournamentLabel: "Spring Cup",
		});
	});

	it("reads date column on the display row", () => {
		expect(
			parseTournamentState(
				["status", "name", "date"],
				[["upcoming", "Spring Cup", "2026-04-12"]],
			),
		).toEqual({
			hasPlannedTournament: true,
			tournamentLabel: "Spring Cup",
			tournamentDate: "2026-04-12",
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
		});
	});

	it("ignores completed-only rows", () => {
		expect(
			parseTournamentState(["status"], [["completed"], ["cancelled"]]),
		).toEqual({
			hasPlannedTournament: false,
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
