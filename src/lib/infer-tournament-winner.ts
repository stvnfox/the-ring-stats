import type {
	LeaderboardRow,
	MapScoreBlock,
	TournamentWinnerInfo,
} from "#/lib/dashboard-types";

function normalizeTeamName(s: string): string {
	return s.trim().toLowerCase();
}

/**
 * Numeric **map** value from the Map column (e.g. `3`, `Map 12`, `12 - Inferno`).
 * Used to find the decider = highest map number. Returns `null` if no digit run found.
 */
export function mapNameNumericOrder(mapName: string): number | null {
	const s = mapName.trim();
	if (s === "") return null;
	if (/^\d+$/.test(s)) return Number(s);
	const m = s.match(/\d+/);
	if (m) return Number(m[0]);
	return null;
}

/**
 * Decider map = block with the **largest** map number in `mapName`. If several blocks share
 * that number, the one **later** in `mapScores` wins (sheet row order). If no block has a
 * parseable number, falls back to the **last** block (legacy order).
 */
export function pickDeciderMapBlock(
	mapScores: MapScoreBlock[],
): MapScoreBlock | undefined {
	if (mapScores.length === 0) return undefined;
	const scored = mapScores.map((block, index) => ({
		block,
		index,
		n: mapNameNumericOrder(block.mapName),
	}));
	const withN = scored.filter(
		(x): x is typeof x & { n: number } => x.n != null,
	);
	if (withN.length === 0) {
		return mapScores[mapScores.length - 1];
	}
	const maxN = Math.max(...withN.map((x) => x.n));
	const tied = withN.filter((x) => x.n === maxN);
	const chosen = tied.reduce((a, b) => (b.index > a.index ? b : a));
	return chosen.block;
}

/**
 * Infer tournament winner from **TeamTotals** + **Map scores**:
 * - Any number of teams may have **match point** in TeamTotals.
 * - The **decider** is the map with the **highest map number** in the Map column (see
 *   `mapNameNumericOrder`). If the Map cell has no digits, order falls back to last block.
 * - The winner is **placement 1** on that map **if** that team is among the match-point
 *   teams (name match is case-insensitive).
 * - `playerNames` are non-empty names from that row’s `playerScores` in sheet order.
 */
export function inferTournamentWinnerFromMatchPointAndLastMap(
	teamScores: LeaderboardRow[],
	mapScores: MapScoreBlock[],
): TournamentWinnerInfo | undefined {
	const mpNorm = new Set(
		teamScores
			.filter((r) => r.onMatchPoint === true)
			.map((r) => normalizeTeamName(r.name))
			.filter((n) => n.length > 0),
	);
	if (mpNorm.size === 0) return undefined;
	if (mapScores.length === 0) return undefined;

	const deciderMap = pickDeciderMapBlock(mapScores);
	if (!deciderMap) return undefined;
	const firstOnMap = deciderMap.teams.filter((t) => t.placement === 1);
	if (firstOnMap.length !== 1) return undefined;

	const mapWinnerRaw = firstOnMap[0].teamName.trim();
	if (!mapWinnerRaw) return undefined;
	if (!mpNorm.has(normalizeTeamName(mapWinnerRaw))) return undefined;

	const totalsRow = teamScores.find(
		(r) => normalizeTeamName(r.name) === normalizeTeamName(mapWinnerRaw),
	);
	const teamName = totalsRow?.name.trim() || mapWinnerRaw;
	const playerNames = firstOnMap[0].playerScores
		.map((p) => p.name.trim())
		.filter((n) => n.length > 0);
	return { teamName, playerNames };
}
