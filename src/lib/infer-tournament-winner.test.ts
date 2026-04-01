import { describe, expect, it } from "vitest";

import {
	inferTournamentWinnerFromMatchPointAndLastMap,
	mapNameNumericOrder,
} from "#/lib/infer-tournament-winner";

const teams = (
	rows: { name: string; rank: number; mp?: boolean }[],
) =>
	rows.map((r) => ({
		rank: r.rank,
		name: r.name,
		score: 10 - r.rank,
		onMatchPoint: r.mp === true,
	}));

const lastMap = (winner: string, others: { name: string; p: number }[]) => ({
	mapName: "Decider",
	teams: [
		{ placement: 1, teamName: winner, playerScores: [], total: 10 },
		...others.map((o) => ({
			placement: o.p,
			teamName: o.name,
			playerScores: [],
			total: 5,
		})),
	],
});

describe("mapNameNumericOrder", () => {
	it("parses plain map index from the sheet", () => {
		expect(mapNameNumericOrder("1")).toBe(1);
		expect(mapNameNumericOrder(" 12 ")).toBe(12);
	});
	it("takes first digit run for labels like Map 3", () => {
		expect(mapNameNumericOrder("Map 3")).toBe(3);
		expect(mapNameNumericOrder("3 - Inferno")).toBe(3);
	});
	it("returns null when there is no number", () => {
		expect(mapNameNumericOrder("Inferno")).toBeNull();
		expect(mapNameNumericOrder("")).toBeNull();
	});
});

describe("inferTournamentWinnerFromMatchPointAndLastMap", () => {
	it("returns #1 on the last map when that team is on match point (single MP)", () => {
		const teamScores = teams([
			{ name: "Lagoon", rank: 1, mp: true },
			{ name: "Reef", rank: 2 },
		]);
		const mapScores = [
			{
				mapName: "Warmup",
				teams: [
					{ placement: 1, teamName: "Reef", playerScores: [], total: 1 },
				],
			},
			lastMap("Lagoon", [{ name: "Reef", p: 2 }]),
		];
		expect(
			inferTournamentWinnerFromMatchPointAndLastMap(teamScores, mapScores),
		).toEqual({ teamName: "Lagoon", playerNames: [] });
	});

	it("allows multiple teams on match point; winner is #1 on last map among them", () => {
		const teamScores = teams([
			{ name: "Lagoon", rank: 1, mp: true },
			{ name: "Reef", rank: 2, mp: true },
		]);
		const mapScores = [lastMap("Reef", [{ name: "Lagoon", p: 2 }])];
		expect(
			inferTournamentWinnerFromMatchPointAndLastMap(teamScores, mapScores),
		).toEqual({ teamName: "Reef", playerNames: [] });
	});

	it("matches team names case-insensitively", () => {
		const teamScores = teams([{ name: "Lagoon", rank: 1, mp: true }]);
		const mapScores = [lastMap("LAGOON", [])];
		expect(
			inferTournamentWinnerFromMatchPointAndLastMap(teamScores, mapScores),
		).toEqual({ teamName: "Lagoon", playerNames: [] });
	});

	it("returns undefined when #1 on last map was not on match point", () => {
		const teamScores = teams([
			{ name: "Lagoon", rank: 1, mp: true },
			{ name: "Reef", rank: 2 },
		]);
		const mapScores = [lastMap("Reef", [{ name: "Lagoon", p: 2 }])];
		expect(
			inferTournamentWinnerFromMatchPointAndLastMap(teamScores, mapScores),
		).toBeUndefined();
	});

	it("returns undefined when nobody is on match point", () => {
		const teamScores = teams([
			{ name: "Lagoon", rank: 1 },
			{ name: "Reef", rank: 2 },
		]);
		const mapScores = [lastMap("Lagoon", [])];
		expect(
			inferTournamentWinnerFromMatchPointAndLastMap(teamScores, mapScores),
		).toBeUndefined();
	});

	it("returns undefined when there is no unique placement 1 on last map", () => {
		const teamScores = teams([
			{ name: "A", rank: 1, mp: true },
			{ name: "B", rank: 2, mp: true },
		]);
		const mapScores = [
			{
				mapName: "X",
				teams: [
					{ placement: 1, teamName: "A", playerScores: [], total: 1 },
					{ placement: 1, teamName: "B", playerScores: [], total: 1 },
				],
			},
		];
		expect(
			inferTournamentWinnerFromMatchPointAndLastMap(teamScores, mapScores),
		).toBeUndefined();
	});

	it("returns undefined when mapScores is empty", () => {
		const teamScores = teams([{ name: "Lagoon", rank: 1, mp: true }]);
		expect(
			inferTournamentWinnerFromMatchPointAndLastMap(teamScores, []),
		).toBeUndefined();
	});

	it("uses the highest map number in the Map column, not row/block order", () => {
		const teamScores = teams([{ name: "Lagoon", rank: 1, mp: true }]);
		const mapScores = [
			{
				mapName: "3",
				teams: [
					{ placement: 1, teamName: "Lagoon", playerScores: [], total: 1 },
				],
			},
			{
				mapName: "1",
				teams: [
					{ placement: 1, teamName: "Reef", playerScores: [], total: 1 },
				],
			},
			{
				mapName: "2",
				teams: [
					{ placement: 1, teamName: "Tide", playerScores: [], total: 1 },
				],
			},
		];
		expect(
			inferTournamentWinnerFromMatchPointAndLastMap(teamScores, mapScores),
		).toEqual({ teamName: "Lagoon", playerNames: [] });
	});

	it("includes decider-map player names in sheet order (trimmed, non-empty only)", () => {
		const teamScores = teams([{ name: "Lagoon", rank: 1, mp: true }]);
		const mapScores = [
			{
				mapName: "Decider",
				teams: [
					{
						placement: 1,
						teamName: "Lagoon",
						playerScores: [
							{ name: " Vox ", score: 1 },
							{ name: "Marvinho", score: 1 },
							{ name: "", score: 1 },
							{ name: "LW", score: 1 },
						],
						total: 4,
					},
				],
			},
		];
		expect(
			inferTournamentWinnerFromMatchPointAndLastMap(teamScores, mapScores),
		).toEqual({
			teamName: "Lagoon",
			playerNames: ["Vox", "Marvinho", "LW"],
		});
	});
});
