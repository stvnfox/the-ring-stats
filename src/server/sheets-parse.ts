import type {
	LeaderboardRow,
	MapPlayerScore,
	MapScoreBlock,
	MapTeamRow,
} from "#/lib/dashboard-types";
import {
	parseTournamentSheetDateToYmd,
	type TournamentSheetYmd,
} from "#/lib/tournament-sheet-date";

function normalizeHeader(cell: string): string {
	return cell.trim().toLowerCase().replace(/\s+/g, " ");
}

export function splitHeaderAndRows(values: string[][] | null | undefined): {
	headers: string[];
	dataRows: string[][];
} {
	if (!values?.length) {
		return { headers: [], dataRows: [] };
	}
	const [first, ...rest] = values;
	const headers = first.map((c) => normalizeHeader(String(c)));
	const dataRows = rest.map((row) => row.map((c) => String(c ?? "").trim()));
	return { headers, dataRows };
}

function findColumnIndex(headers: string[], candidates: string[]): number {
	for (const cand of candidates) {
		const idx = headers.findIndex(
			(h) => h === cand || h.includes(cand) || cand.includes(h),
		);
		if (idx >= 0) return idx;
	}
	return -1;
}

function findColumnIndexExcluding(
	headers: string[],
	candidates: string[],
	exclude: Set<number>,
): number {
	for (const cand of candidates) {
		const idx = headers.findIndex(
			(h, i) =>
				!exclude.has(i) && (h === cand || h.includes(cand) || cand.includes(h)),
		);
		if (idx >= 0) return idx;
	}
	return -1;
}

/** Exact / normalized match only — avoids Team matching TeamScore via substring rules */
function findDiscordColumn(headers: string[], names: string[]): number {
	for (const raw of names) {
		const n = normalizeHeader(raw).replace(/\s+/g, "");
		const idx = headers.findIndex((h) => {
			const hn = h.replace(/\s+/g, "");
			return hn === n || h === normalizeHeader(raw);
		});
		if (idx >= 0) return idx;
	}
	return -1;
}

/**
 * Parses a cell number. Handles US (`1,234.56`) and European (`1.234,56`, `43,2`)
 * formats. Previously we stripped all commas, so `43,2` became `432` instead of `43.2`.
 */
function parseNumber(raw: string): number | null {
	const cleaned = raw.replace(/^\s+|\s+$/g, "");
	if (cleaned === "") return null;

	const lastComma = cleaned.lastIndexOf(",");
	const lastPeriod = cleaned.lastIndexOf(".");

	// Both separators: the rightmost one is the decimal separator
	if (lastComma >= 0 && lastPeriod >= 0) {
		if (lastComma > lastPeriod) {
			// European: 1.234,56
			const normalized = cleaned.replace(/\./g, "").replace(",", ".");
			const n = Number.parseFloat(normalized);
			return Number.isFinite(n) ? n : null;
		}
		// US: 1,234.56
		const normalized = cleaned.replace(/,/g, "");
		const n = Number.parseFloat(normalized);
		return Number.isFinite(n) ? n : null;
	}

	// Only comma: decimal comma (43,2) vs thousands (1,234)
	if (lastComma >= 0 && lastPeriod < 0) {
		const parts = cleaned.split(",");
		if (parts.length === 2 && parts[1] !== undefined && parts[1].length <= 2) {
			const n = Number.parseFloat(`${parts[0]}.${parts[1]}`);
			return Number.isFinite(n) ? n : null;
		}
		const n = Number.parseFloat(cleaned.replace(/,/g, ""));
		return Number.isFinite(n) ? n : null;
	}

	// Plain number (43.2, 432, etc.)
	const n = Number.parseFloat(cleaned);
	return Number.isFinite(n) ? n : null;
}

const INACTIVE_STATUS =
	/^(completed|cancelled|canceled|past|done|none|no|skipped|skip)$/i;

/** Status values that mean “this is the event whose stats are on the dashboard” */
const LIVE_STATUS =
	/^(live|active|ongoing|in progress|playing|now|current)$/i;

function isCurrentColumnCell(raw: string): boolean {
	const v = raw.trim().toLowerCase();
	return (
		v === "yes" ||
		v === "true" ||
		v === "1" ||
		v === "x" ||
		v === "y" ||
		v === "✓" ||
		v === "*"
	);
}

/** “Today” vs event dates for the home dashboard (Dutch local calendar). */
const DASHBOARD_CALENDAR_TIMEZONE = "Europe/Amsterdam";

function getCalendarYmdInZone(inst: Date, timeZone: string): TournamentSheetYmd {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	let y = 0;
	let m = 0;
	let d = 0;
	for (const p of formatter.formatToParts(inst)) {
		if (p.type === "year") y = Number(p.value);
		else if (p.type === "month") m = Number(p.value);
		else if (p.type === "day") d = Number(p.value);
	}
	return { y, m, d };
}

function calendarYmdKey(ymd: TournamentSheetYmd): number {
	return ymd.y * 10000 + ymd.m * 100 + ymd.d;
}

/**
 * Sheet date cell → calendar Y-M-D. Primary format **DD-MM-YYYY**; then
 * **YYYY-MM-DD** prefix (`parseTournamentSheetDateToYmd`); else `Date.parse`
 * and the calendar day in `timeZone`.
 */
function sheetTournamentDateToCalendarYmd(
	raw: string,
	timeZone: string,
): TournamentSheetYmd | null {
	const fromCell = parseTournamentSheetDateToYmd(raw);
	if (fromCell) return fromCell;
	const s = raw.trim();
	const t = Date.parse(s);
	if (Number.isNaN(t)) return null;
	return getCalendarYmdInZone(new Date(t), timeZone);
}

/**
 * True when the event’s calendar date is strictly before “today” in `timeZone`.
 * Missing or unparsable dates are not treated as past.
 */
function isPastTournamentDay(
	rawDate: string | undefined,
	now: Date,
	timeZone: string,
): boolean {
	if (!rawDate?.trim()) return false;
	const eventYmd = sheetTournamentDateToCalendarYmd(rawDate, timeZone);
	if (!eventYmd) return false;
	const todayYmd = getCalendarYmdInZone(now, timeZone);
	return calendarYmdKey(eventYmd) < calendarYmdKey(todayYmd);
}

/** True when the sheet date is strictly after “today” in `timeZone`. */
function isStrictlyFutureTournamentDay(
	rawDate: string | undefined,
	now: Date,
	timeZone: string,
): boolean {
	if (!rawDate?.trim()) return false;
	const eventYmd = sheetTournamentDateToCalendarYmd(rawDate, timeZone);
	if (!eventYmd) return false;
	const todayYmd = getCalendarYmdInZone(now, timeZone);
	return calendarYmdKey(eventYmd) > calendarYmdKey(todayYmd);
}

/** Same rules as the home dashboard display row (for dummy data / reuse). */
export function tournamentSheetDateIsStrictlyFuture(
	raw: string | undefined,
	options?: { now?: Date; calendarTimeZone?: string },
): boolean {
	const now = options?.now ?? new Date();
	const tz =
		options?.calendarTimeZone?.trim() || DASHBOARD_CALENDAR_TIMEZONE;
	return isStrictlyFutureTournamentDay(raw, now, tz);
}

export function parseTournamentState(
	headers: string[],
	dataRows: string[][],
	options?: { now?: Date; calendarTimeZone?: string },
): {
	hasPlannedTournament: boolean;
	tournamentLabel?: string;
	tournamentDate?: string;
	isInFuture: boolean;
} {
	const now = options?.now ?? new Date();
	const calendarTz =
		options?.calendarTimeZone?.trim() || DASHBOARD_CALENDAR_TIMEZONE;
	const nonEmptyRows = dataRows.filter((row) =>
		row.some((c) => c.trim() !== ""),
	);
	if (nonEmptyRows.length === 0) {
		return { hasPlannedTournament: false, isInFuture: false };
	}

	const statusIdx = findColumnIndex(headers, [
		"status",
		"state",
		"phase",
		"tournament status",
	]);
	const nameIdx = findColumnIndex(headers, [
		"name",
		"title",
		"tournament",
		"event",
		"tourney",
		"event name",
	]);
	const dateIdx = findColumnIndex(headers, [
		"date",
		"start date",
		"starts",
		"when",
		"event date",
		"day",
		"start",
	]);
	const currentIdx = findColumnIndex(headers, [
		"current",
		"featured",
		"display",
		"dashboard",
		"primary",
		"show",
		"show on dashboard",
	]);

	function rowDate(row: string[]): string | undefined {
		if (dateIdx < 0) return undefined;
		const d = (row[dateIdx] ?? "").trim();
		return d || undefined;
	}

	function rowLabel(row: string[]): string | undefined {
		const label = nameIdx >= 0 ? (row[nameIdx] ?? "").trim() : row[0]?.trim();
		return label || undefined;
	}

	function rowIsInactive(row: string[]): boolean {
		if (statusIdx < 0) return false;
		const st = (row[statusIdx] ?? "").trim();
		return Boolean(st && INACTIVE_STATUS.test(st));
	}

	function rowIsLiveStatus(row: string[]): boolean {
		if (statusIdx < 0) return false;
		const st = (row[statusIdx] ?? "").trim();
		return Boolean(st && LIVE_STATUS.test(st));
	}

	/**
	 * Home dashboard: hide past start dates vs “today” in Europe/Amsterdam. Live still wins
	 * for multi-day events. “Current” does not override a past date (sheet often left checked).
	 */
	function rowEligibleForHome(row: string[]): boolean {
		if (rowIsInactive(row)) return false;
		if (rowIsLiveStatus(row)) return true;
		if (isPastTournamentDay(rowDate(row), now, calendarTz)) return false;
		if (currentIdx >= 0 && isCurrentColumnCell(row[currentIdx] ?? ""))
			return true;
		return true;
	}

	let hasPlannedTournament = false;
	for (const row of nonEmptyRows) {
		if (rowEligibleForHome(row)) {
			hasPlannedTournament = true;
			break;
		}
	}

	/** Row whose name/date appear in the dashboard hero — matches displayed stats */
	let displayRow: string[] | undefined;

	if (currentIdx >= 0) {
		for (const row of nonEmptyRows) {
			if (!rowEligibleForHome(row)) continue;
			if (isCurrentColumnCell(row[currentIdx] ?? "")) {
				displayRow = row;
				break;
			}
		}
	}

	if (!displayRow && statusIdx >= 0) {
		for (const row of nonEmptyRows) {
			if (!rowEligibleForHome(row)) continue;
			if (rowIsLiveStatus(row)) {
				displayRow = row;
				break;
			}
		}
	}

	if (!displayRow && statusIdx >= 0) {
		for (const row of nonEmptyRows) {
			if (!rowEligibleForHome(row)) continue;
			displayRow = row;
			break;
		}
	}

	if (!displayRow && statusIdx < 0) {
		for (const row of nonEmptyRows) {
			if (!rowEligibleForHome(row)) continue;
			displayRow = row;
			break;
		}
	}

	const tournamentDate = displayRow ? rowDate(displayRow) : undefined;
	const isInFuture = isStrictlyFutureTournamentDay(
		tournamentDate,
		now,
		calendarTz,
	);

	return {
		hasPlannedTournament,
		tournamentLabel: displayRow ? rowLabel(displayRow) : undefined,
		tournamentDate,
		isInFuture,
	};
}

const NAME_KEYS = [
	"player",
	"name",
	"ign",
	"gamer",
	"nickname",
	"pilot",
	"player name",
	"top fragger",
];

/** PlayerTotals: prefer TotalKills */
const PLAYER_TOTAL_KILL_KEYS = [
	"totalkills",
	"total kills",
	"kills",
	"score",
	"points",
	"pts",
	"frags",
	"kd",
	"k/d",
	"total",
];

const SCORE_KEYS = [
	"kills",
	"score",
	"points",
	"pts",
	"frags",
	"kd",
	"k/d",
	"total",
];

/** TeamTotals: points column — MatchPoint is read separately (not used as TotalScore) */
const TEAM_SCORE_KEYS = [
	"totalscore",
	"total score",
	"score",
	"points",
	"pts",
	"kills",
	"total",
];

const MATCH_POINT_FLAG_KEYS = ["matchpoint", "match point"];

function pickLeaderboardRows(
	headers: string[],
	dataRows: string[][],
	nameKeys: string[],
	scoreKeys: string[],
): { name: string; score: number | null }[] {
	const nameIdx = findColumnIndex(headers, nameKeys);
	const scoreIdx = findColumnIndex(headers, scoreKeys);

	const out: { name: string; score: number | null }[] = [];
	for (const row of dataRows) {
		const name =
			nameIdx >= 0
				? (row[nameIdx] ?? "").trim()
				: (row.find((c) => c.trim()) ?? "").trim();
		if (!name) continue;

		let score: number | null = null;
		if (scoreIdx >= 0) {
			score = parseNumber(row[scoreIdx] ?? "");
		} else {
			for (const cell of row) {
				const n = parseNumber(cell);
				if (n !== null) {
					score = n;
					break;
				}
			}
		}
		out.push({ name, score });
	}
	return out;
}

function assignRanks(
	rows: { name: string; score: number | null }[],
): LeaderboardRow[] {
	const sorted = [...rows].sort((a, b) => {
		const sa = a.score ?? Number.NEGATIVE_INFINITY;
		const sb = b.score ?? Number.NEGATIVE_INFINITY;
		if (sb !== sa) return sb - sa;
		return a.name.localeCompare(b.name);
	});
	return sorted.map((r, i) => ({
		rank: i + 1,
		name: r.name,
		score: r.score,
	}));
}

/** MatchPoint column: yes / 1 / x / numeric > 0 → on match point */
function parseMatchPointCell(raw: string): boolean {
	const s = raw.trim().toLowerCase();
	if (!s) return false;
	if (["yes", "y", "true", "x", "on", "mp"].includes(s)) return true;
	if (["no", "n", "false", "off", "-"].includes(s)) return false;
	const n = Number.parseFloat(s.replace(/,/g, ""));
	if (Number.isFinite(n)) return n > 0;
	return true;
}

function assignTeamRanks(
	rows: { name: string; score: number | null; onMatchPoint: boolean }[],
): LeaderboardRow[] {
	const sorted = [...rows].sort((a, b) => {
		const sa = a.score ?? Number.NEGATIVE_INFINITY;
		const sb = b.score ?? Number.NEGATIVE_INFINITY;
		if (sb !== sa) return sb - sa;
		return a.name.localeCompare(b.name);
	});
	return sorted.map((r, i) => ({
		rank: i + 1,
		name: r.name,
		score: r.score,
		onMatchPoint: r.onMatchPoint,
	}));
}

function pickTeamLeaderboardRows(
	headers: string[],
	dataRows: string[][],
): { name: string; score: number | null; onMatchPoint: boolean }[] {
	const nameIdx = findColumnIndex(headers, TEAM_NAME_KEYS);
	const scoreIdx = findColumnIndex(headers, TEAM_SCORE_KEYS);
	const mpIdx = findDiscordColumn(headers, MATCH_POINT_FLAG_KEYS);

	const out: {
		name: string;
		score: number | null;
		onMatchPoint: boolean;
	}[] = [];
	for (const row of dataRows) {
		const name =
			nameIdx >= 0
				? (row[nameIdx] ?? "").trim()
				: (row.find((c) => c.trim()) ?? "").trim();
		if (!name) continue;

		let score: number | null = null;
		if (scoreIdx >= 0) {
			score = parseNumber(row[scoreIdx] ?? "");
		} else {
			for (const cell of row) {
				const n = parseNumber(cell);
				if (n !== null) {
					score = n;
					break;
				}
			}
		}
		const onMatchPoint =
			mpIdx >= 0 ? parseMatchPointCell(row[mpIdx] ?? "") : false;
		out.push({ name, score, onMatchPoint });
	}
	return out;
}

export function parseTopFraggers(
	values: string[][] | null | undefined,
): LeaderboardRow[] {
	const { headers, dataRows } = splitHeaderAndRows(values);
	if (headers.length === 0) return [];
	const rows = pickLeaderboardRows(
		headers,
		dataRows,
		NAME_KEYS,
		PLAYER_TOTAL_KILL_KEYS,
	);
	return assignRanks(rows);
}

const TEAM_NAME_KEYS = ["team", "team name", "squad", "clan", "tag"];

/** Extra headers used only for map long-format rows */
const MAP_TEAM_KEYS = [...TEAM_NAME_KEYS, "side"];

export function parseTeamScores(
	values: string[][] | null | undefined,
): LeaderboardRow[] {
	const { headers, dataRows } = splitHeaderAndRows(values);
	if (headers.length === 0) return [];
	const rows = pickTeamLeaderboardRows(headers, dataRows);
	return assignTeamRanks(rows);
}

const MAP_KEYS = [
	"map",
	"maps",
	"map name",
	"level",
	"stage",
	"round",
	"match",
	"de_map",
	"map / side",
];

const MAP_PLAYER_KEYS = [
	"player",
	"player name",
	"ign",
	"gamer",
	"nickname",
	"pilot",
	"name",
];

function sumPlayerScores(players: MapPlayerScore[]): number | null {
	if (players.length === 0) return null;
	let s = 0;
	let any = false;
	for (const p of players) {
		if (p.score != null) {
			s += p.score;
			any = true;
		}
	}
	return any ? s : null;
}

function finalizeTeamRows(
	teamAgg: Map<
		string,
		{ players: MapPlayerScore[]; singleScore: number | null }
	>,
): MapTeamRow[] {
	const rows: MapTeamRow[] = [];
	for (const [teamName, agg] of teamAgg) {
		const players = agg.players;
		const total =
			players.length > 0 ? sumPlayerScores(players) : agg.singleScore;
		rows.push({
			placement: 0,
			teamName,
			playerScores: players,
			total,
		});
	}
	const sorted = [...rows].sort((a, b) => {
		const ta = a.total ?? Number.NEGATIVE_INFINITY;
		const tb = b.total ?? Number.NEGATIVE_INFINITY;
		if (tb !== ta) return tb - ta;
		return a.teamName.localeCompare(b.teamName);
	});
	return sorted.map((t, i) => ({ ...t, placement: i + 1 }));
}

type DiscordMapTeamRowBuild = {
	teamName: string;
	playerScores: MapPlayerScore[];
	total: number | null;
	sheetPlacement: number | null;
};

function finalizeDiscordMapTeams(
	teamRows: DiscordMapTeamRowBuild[],
): MapTeamRow[] {
	if (teamRows.length === 0) return [];
	const allPlaced = teamRows.every(
		(t) => t.sheetPlacement != null && Number.isFinite(t.sheetPlacement),
	);
	let sorted: DiscordMapTeamRowBuild[];
	if (allPlaced) {
		sorted = [...teamRows].sort(
			(a, b) => (a.sheetPlacement ?? 0) - (b.sheetPlacement ?? 0),
		);
		return sorted.map((t) => ({
			placement: Math.trunc(t.sheetPlacement ?? 0),
			teamName: t.teamName,
			playerScores: t.playerScores,
			total: t.total,
		}));
	}
	sorted = [...teamRows].sort((a, b) => {
		const tb = b.total ?? Number.NEGATIVE_INFINITY;
		const ta = a.total ?? Number.NEGATIVE_INFINITY;
		if (tb !== ta) return tb - ta;
		return a.teamName.localeCompare(b.teamName);
	});
	return sorted.map((t, i) => ({
		placement: i + 1,
		teamName: t.teamName,
		playerScores: t.playerScores,
		total: t.total,
	}));
}

/**
 * MapScores tab: one row per team per map with Team, Map, Placement, Player1,
 * P1Kills, … (Discord bot output).
 */
function parseMapScoresDiscordRowFormat(
	values: string[][],
): MapScoreBlock[] | null {
	const { headers, dataRows } = splitHeaderAndRows(values);
	if (headers.length === 0) return null;

	const teamIdx = findColumnIndex(headers, TEAM_NAME_KEYS);
	const mapIdx = findColumnIndex(headers, MAP_KEYS);
	const p1Idx = findDiscordColumn(headers, ["player1", "player 1"]);
	const p1kIdx = findDiscordColumn(headers, ["p1kills", "p1 kills"]);
	if (teamIdx < 0 || mapIdx < 0 || p1Idx < 0 || p1kIdx < 0) return null;

	const placementIdx = findDiscordColumn(headers, [
		"placement",
		"place",
		"rank",
	]);
	const teamScoreIdx = findDiscordColumn(headers, ["teamscore", "team score"]);
	const totalKillsIdx = findDiscordColumn(headers, [
		"totalkills",
		"total kills",
	]);

	const playerKillSlots = [
		{ p: ["player1", "player 1"], k: ["p1kills", "p1 kills"] },
		{ p: ["player2", "player 2"], k: ["p2kills", "p2 kills"] },
		{ p: ["player3", "player 3"], k: ["p3kills", "p3 kills"] },
	].map(({ p, k }) => ({
		pIdx: findDiscordColumn(headers, p),
		kIdx: findDiscordColumn(headers, k),
	}));

	const mapOrder: string[] = [];
	const seenMaps = new Set<string>();
	const byMap = new Map<string, DiscordMapTeamRowBuild[]>();

	for (const row of dataRows) {
		const mapName = (row[mapIdx] ?? "").trim();
		const teamName = (row[teamIdx] ?? "").trim();
		if (!mapName || !teamName) continue;

		const players: MapPlayerScore[] = [];
		for (const { pIdx, kIdx } of playerKillSlots) {
			if (pIdx < 0 || kIdx < 0) continue;
			const pname = (row[pIdx] ?? "").trim();
			const kills = parseNumber(row[kIdx] ?? "");
			if (pname) players.push({ name: pname, score: kills });
		}

		const teamScore =
			teamScoreIdx >= 0 ? parseNumber(row[teamScoreIdx] ?? "") : null;
		const totalKillsCol =
			totalKillsIdx >= 0 ? parseNumber(row[totalKillsIdx] ?? "") : null;
		const total = teamScore ?? totalKillsCol ?? sumPlayerScores(players);

		const sheetPlacementRaw =
			placementIdx >= 0 ? parseNumber(row[placementIdx] ?? "") : null;
		const sheetPlacement =
			sheetPlacementRaw != null && Number.isFinite(sheetPlacementRaw)
				? sheetPlacementRaw
				: null;

		if (!seenMaps.has(mapName)) {
			seenMaps.add(mapName);
			mapOrder.push(mapName);
		}

		const list = byMap.get(mapName) ?? [];
		list.push({
			teamName,
			playerScores: players,
			total,
			sheetPlacement,
		});
		byMap.set(mapName, list);
	}

	return mapOrder.map((mapName) => ({
		mapName,
		teams: finalizeDiscordMapTeams(byMap.get(mapName) ?? []),
	}));
}

/**
 * Long format: Map / Team / (Player) / Score — multiple rows per team add players.
 * Wide format: row 0 = Map | TeamA | TeamB | …, one score per team per map row.
 */
export function parseMapScores(
	values: string[][] | null | undefined,
): MapScoreBlock[] {
	if (!values?.length) return [];

	const discord = parseMapScoresDiscordRowFormat(values);
	if (discord != null) return discord;

	const { headers, dataRows } = splitHeaderAndRows(values);
	if (headers.length === 0) return [];

	const mapIdx = findColumnIndex(headers, MAP_KEYS);
	const teamIdx = findColumnIndex(headers, MAP_TEAM_KEYS);
	const scoreIdx = findColumnIndex(headers, SCORE_KEYS);
	const playerIdx =
		mapIdx >= 0 && teamIdx >= 0
			? findColumnIndexExcluding(
					headers,
					MAP_PLAYER_KEYS,
					new Set([mapIdx, teamIdx]),
				)
			: -1;

	if (mapIdx >= 0 && teamIdx >= 0) {
		const byMap = new Map<
			string,
			Map<string, { players: MapPlayerScore[]; singleScore: number | null }>
		>();
		const mapOrder: string[] = [];
		const seenMaps = new Set<string>();

		for (const row of dataRows) {
			const mapName = (row[mapIdx] ?? "").trim();
			const teamName = (row[teamIdx] ?? "").trim();
			if (!mapName || !teamName) continue;

			let score: number | null = null;
			if (scoreIdx >= 0) {
				score = parseNumber(row[scoreIdx] ?? "");
			} else {
				for (const cell of row) {
					const n = parseNumber(cell);
					if (n !== null) {
						score = n;
						break;
					}
				}
			}

			if (!seenMaps.has(mapName)) {
				seenMaps.add(mapName);
				mapOrder.push(mapName);
			}

			let teamMap = byMap.get(mapName);
			if (!teamMap) {
				teamMap = new Map();
				byMap.set(mapName, teamMap);
			}

			const playerName = playerIdx >= 0 ? (row[playerIdx] ?? "").trim() : "";
			let agg = teamMap.get(teamName);
			if (!agg) {
				agg = { players: [], singleScore: null };
				teamMap.set(teamName, agg);
			}

			if (playerIdx >= 0 && playerName) {
				agg.players.push({ name: playerName, score });
			} else {
				agg.singleScore = score;
			}
		}

		return mapOrder.map((mapName) => ({
			mapName,
			teams: finalizeTeamRows(byMap.get(mapName) ?? new Map()),
		}));
	}

	// Wide grid: first column = map name, remaining columns = team scores
	const rawHeader = values[0].map((c) => String(c ?? "").trim());
	if (rawHeader.length < 2) return [];

	const firstLabel = normalizeHeader(rawHeader[0] ?? "");
	const mapCol =
		firstLabel === "" ||
		/^(maps?|round|level|stage|match|#|m)$/i.test(rawHeader[0] ?? "") ||
		findColumnIndex([firstLabel], MAP_KEYS) >= 0;

	if (!mapCol) return [];

	const teamStart = 1;
	const teamHeaders = rawHeader.slice(teamStart);
	if (teamHeaders.every((h) => !h)) return [];

	const blocks: MapScoreBlock[] = [];
	for (const row of values.slice(1)) {
		const mapName = (row[0] ?? "").trim();
		if (!mapName) continue;

		const pairs: { name: string; score: number | null }[] = [];
		for (let j = teamStart; j < rawHeader.length; j++) {
			const teamName = rawHeader[j]?.trim();
			if (!teamName) continue;
			const score = parseNumber(row[j] ?? "");
			pairs.push({ name: teamName, score });
		}
		if (pairs.length === 0) continue;
		const ranked = assignRanks(pairs);
		const teams: MapTeamRow[] = ranked.map((r) => ({
			placement: r.rank,
			teamName: r.name,
			playerScores: [],
			total: r.score,
		}));
		blocks.push({
			mapName,
			teams,
		});
	}

	return blocks;
}

/**
 * Stacked archive tab layout (one sheet per event, archive spreadsheet).
 * Column A marks sections; optional meta rows before the first marker use A=key, B=value.
 *
 * Markers (exact cell in column A, trimmed):
 * - `__PlayerTotals__` — next row is header, then data (same columns as live PlayerTotals)
 * - `__TeamTotals__` — same as live TeamTotals
 * - `__MapScores__` — same as live MapScores (Discord or long/wide format)
 *
 * Supported meta keys (normalized): eventname, tournament, name → tournamentLabel;
 * eventdate, date → tournamentDate.
 */
export const ARCHIVE_MARKER_PLAYER = "__PlayerTotals__";
export const ARCHIVE_MARKER_TEAM = "__TeamTotals__";
export const ARCHIVE_MARKER_MAP = "__MapScores__";

const ARCHIVE_MARKERS = new Set([
	ARCHIVE_MARKER_PLAYER,
	ARCHIVE_MARKER_TEAM,
	ARCHIVE_MARKER_MAP,
]);

export type SplitStackedArchiveResult = {
	players: string[][];
	teams: string[][];
	maps: string[][];
	eventLabel?: string;
	/** EventDate / Date meta row (col B); **DD-MM-YYYY** like the main Tournaments tab */
	eventDate?: string;
};

function isArchiveSectionMarker(cellA: string): boolean {
	return ARCHIVE_MARKERS.has(cellA.trim());
}

export function splitStackedArchiveValues(
	values: string[][] | null | undefined,
): SplitStackedArchiveResult {
	const result: SplitStackedArchiveResult = {
		players: [],
		teams: [],
		maps: [],
	};

	if (!values?.length) {
		return result;
	}

	const rows = values.map((r) => r.map((c) => String(c ?? "").trim()));

	let i = 0;
	let eventLabel: string | undefined;
	let eventDate: string | undefined;

	while (i < rows.length) {
		const a = (rows[i]?.[0] ?? "").trim();
		if (isArchiveSectionMarker(a)) break;
		const b = (rows[i]?.[1] ?? "").trim();
		const key = normalizeHeader(a).replace(/\s+/g, "");
		if (
			key === "eventname" ||
			key === "tournament" ||
			key === "tournamentname"
		) {
			if (b) eventLabel = b;
		} else if (key === "eventdate" || key === "date") {
			if (b) eventDate = b;
		}
		i++;
	}

	while (i < rows.length) {
		const marker = (rows[i]?.[0] ?? "").trim();
		if (!isArchiveSectionMarker(marker)) {
			i++;
			continue;
		}
		i++;
		const slice: string[][] = [];
		while (i < rows.length) {
			const nextA = (rows[i]?.[0] ?? "").trim();
			if (isArchiveSectionMarker(nextA)) break;
			slice.push(rows[i]);
			i++;
		}
		if (marker === ARCHIVE_MARKER_PLAYER) result.players = slice;
		else if (marker === ARCHIVE_MARKER_TEAM) result.teams = slice;
		else result.maps = slice;
	}

	return {
		...result,
		eventLabel,
		eventDate,
	};
}
