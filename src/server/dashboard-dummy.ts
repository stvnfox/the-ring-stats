import type { DashboardData } from "#/lib/dashboard-types";

/** Preview data for layout / design when the sheet is empty or unreachable. */
export function getSampleDashboardData(): DashboardData {
	return {
		hasPlannedTournament: true,
		tournamentLabel: "Spring Cup 2026 (sample)",
		tournamentDate: "2026-04-12",
		topFraggers: [
			{ rank: 1, name: "vex", score: 47 },
			{ rank: 2, name: "nio", score: 41 },
			{ rank: 3, name: "kade", score: 38 },
			{ rank: 4, name: "ora", score: 35 },
			{ rank: 5, name: "flux", score: 31 },
		],
		teamScores: [
			{ rank: 1, name: "Lagoon", score: 142, onMatchPoint: true },
			{ rank: 2, name: "Reef", score: 128 },
			{ rank: 3, name: "Drift", score: 119 },
			{ rank: 4, name: "Tide", score: 104 },
		],
		mapScores: [
			{
				mapName: "Inferno",
				teams: [
					{
						placement: 1,
						teamName: "Lagoon",
						playerScores: [
							{ name: "vex", score: 24 },
							{ name: "nio", score: 19 },
							{ name: "kade", score: 14 },
						],
						total: 57,
					},
					{
						placement: 2,
						teamName: "Reef",
						playerScores: [
							{ name: "ora", score: 21 },
							{ name: "flux", score: 18 },
							{ name: "mav", score: 11 },
						],
						total: 50,
					},
					{
						placement: 3,
						teamName: "Drift",
						playerScores: [
							{ name: "sol", score: 17 },
							{ name: "eli", score: 15 },
						],
						total: 32,
					},
				],
			},
			{
				mapName: "Mirage",
				teams: [
					{
						placement: 1,
						teamName: "Reef",
						playerScores: [
							{ name: "ora", score: 26 },
							{ name: "flux", score: 20 },
						],
						total: 46,
					},
					{
						placement: 2,
						teamName: "Lagoon",
						playerScores: [
							{ name: "vex", score: 22 },
							{ name: "nio", score: 19 },
						],
						total: 41,
					},
					{
						placement: 3,
						teamName: "Tide",
						playerScores: [
							{ name: "neo", score: 18 },
							{ name: "ada", score: 12 },
						],
						total: 30,
					},
				],
			},
			{
				mapName: "Nuke",
				teams: [
					{
						placement: 1,
						teamName: "Drift",
						playerScores: [
							{ name: "sol", score: 25 },
							{ name: "eli", score: 22 },
						],
						total: 47,
					},
					{
						placement: 2,
						teamName: "Tide",
						playerScores: [
							{ name: "neo", score: 20 },
							{ name: "ada", score: 16 },
						],
						total: 36,
					},
					{
						placement: 3,
						teamName: "Lagoon",
						playerScores: [
							{ name: "vex", score: 19 },
							{ name: "kade", score: 14 },
						],
						total: 33,
					},
				],
			},
		],
		fetchedAt: new Date().toISOString(),
		isSampleData: true,
	};
}
