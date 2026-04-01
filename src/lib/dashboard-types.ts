export type TournamentWinnerInfo = {
	teamName: string;
	playerNames: string[];
};

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
	/** Tournaments tab row that matches the stats shown; past-dated rows are hidden on home (vs NL date) unless live */
	tournamentLabel?: string;
	/** Same row: date cell, **DD-MM-YYYY** in the sheet (ISO prefix also accepted when parsing) */
	tournamentDate?: string;
	/** Display row date is strictly after today (Europe/Amsterdam); false if missing/unparseable */
	isInFuture: boolean;
	topFraggers: LeaderboardRow[];
	teamScores: LeaderboardRow[];
	/** Per-map team scores from the Map scores tab */
	mapScores: MapScoreBlock[];
	/**
	 * At least one team on match point in TeamTotals; winner is **placement 1** on the map with
	 * the **highest map number** in the Map column (digits in `mapName`). No digits → last block.
	 * `playerNames` come from that map row’s player columns (sheet order).
	 */
	tournamentWinner?: TournamentWinnerInfo;
	fetchedAt: string;
	/** True when `DASHBOARD_USE_DUMMY_DATA` filled in empty/error/missing-sheet responses */
	isSampleData?: boolean;
};
