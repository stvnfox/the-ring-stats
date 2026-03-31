export type LeaderboardRow = {
	rank: number;
	name: string;
	score: number | null;
	/** TeamTotals: true when the MatchPoint cell indicates this team is on match point */
	onMatchPoint?: boolean;
};

export type MapPlayerScore = {
	name: string;
	score: number | null;
};

/** One team on a map: roster + total, sorted by placement (1 = best) */
export type MapTeamRow = {
	placement: number;
	teamName: string;
	playerScores: MapPlayerScore[];
	total: number | null;
};

/** One map’s worth of team rows (sheet label kept for editors; UI shows Map 1, …) */
export type MapScoreBlock = {
	mapName: string;
	teams: MapTeamRow[];
};

export type DashboardData = {
	hasPlannedTournament: boolean;
	/** Tournaments tab row that matches the stats shown (not “next upcoming” by default) */
	tournamentLabel?: string;
	/** Same row: optional date cell (e.g. Date / Start) */
	tournamentDate?: string;
	topFraggers: LeaderboardRow[];
	teamScores: LeaderboardRow[];
	/** Per-map team scores from the Map scores tab */
	mapScores: MapScoreBlock[];
	fetchedAt: string;
	/** True when `DASHBOARD_USE_DUMMY_DATA` filled in empty/error/missing-sheet responses */
	isSampleData?: boolean;
};
