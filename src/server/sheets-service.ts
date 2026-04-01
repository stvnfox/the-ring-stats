import { google } from "googleapis";

import type { DashboardData } from "#/lib/dashboard-types";
import { inferTournamentWinnerFromMatchPointAndLastMap } from "#/lib/infer-tournament-winner";
import { getSampleDashboardData } from "#/server/dashboard-dummy";

import {
	parseMapScores,
	parseTeamScores,
	parseTopFraggers,
	parseTournamentState,
	splitHeaderAndRows,
} from "#/server/sheets-parse";

function requireEnv(name: string): string {
	const v = process.env[name];
	if (!v?.trim()) {
		throw new Error(
			`Missing environment variable ${name}. Copy .env.example to .env and configure Google Sheets access.`,
		);
	}
	return v.trim();
}

function canTrySheet(): boolean {
	const id = process.env.GOOGLE_SPREADSHEET_ID?.trim();
	const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
	return Boolean(id && json);
}

function isEmptyLeaderboards(data: DashboardData): boolean {
	const noMaps =
		data.mapScores.length === 0 ||
		data.mapScores.every((m) => m.teams.length === 0);
	return (
		data.topFraggers.length === 0 &&
		data.teamScores.length === 0 &&
		noMaps
	);
}

function sheetRange(tabName: string): string {
	const escaped = tabName.replace(/'/g, "''");
	return `'${escaped}'!A:ZZ`;
}

function getTabNames() {
	return {
		tournaments: process.env.SHEET_TAB_TOURNAMENTS?.trim() || "Tournaments",
		topFragger: process.env.SHEET_TAB_TOP_FRAGGER?.trim() || "PlayerTotals",
		teamScores: process.env.SHEET_TAB_TEAM_SCORES?.trim() || "TeamTotals",
		mapScores: process.env.SHEET_TAB_MAP_SCORES?.trim() || "MapScores",
	};
}

async function fetchSheetDashboard(): Promise<DashboardData> {
	const spreadsheetId = requireEnv("GOOGLE_SPREADSHEET_ID");
	const jsonRaw = requireEnv("GOOGLE_SERVICE_ACCOUNT_JSON");

	let credentials: Record<string, unknown>;
	try {
		credentials = JSON.parse(jsonRaw) as Record<string, unknown>;
	} catch {
		throw new Error(
			"GOOGLE_SERVICE_ACCOUNT_JSON must be valid JSON (paste the full service account key as one line).",
		);
	}

	const auth = new google.auth.GoogleAuth({
		credentials,
		scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
	});

	const sheets = google.sheets({ version: "v4", auth });
	const tabs = getTabNames();
	const ranges = [
		sheetRange(tabs.tournaments),
		sheetRange(tabs.topFragger),
		sheetRange(tabs.teamScores),
		sheetRange(tabs.mapScores),
	];

	const res = await sheets.spreadsheets.values.batchGet({
		spreadsheetId,
		ranges,
	});

	const valueRanges = res.data.valueRanges ?? [];
	const tValues = valueRanges[0]?.values as string[][] | undefined;
	const fValues = valueRanges[1]?.values as string[][] | undefined;
	const sValues = valueRanges[2]?.values as string[][] | undefined;
	const mValues = valueRanges[3]?.values as string[][] | undefined;

	const { headers: tHeaders, dataRows: tRows } = splitHeaderAndRows(tValues);
	const tournament = parseTournamentState(tHeaders, tRows);

	const topFraggers = parseTopFraggers(fValues);
	const teamScores = parseTeamScores(sValues);
	const mapScores = parseMapScores(mValues);
	const fetchedAt = new Date().toISOString();

	if (!tournament.hasPlannedTournament) {
		return {
			hasPlannedTournament: false,
			tournamentLabel: undefined,
			tournamentDate: undefined,
			isInFuture: false,
			topFraggers: [],
			teamScores: [],
			mapScores: [],
			fetchedAt,
		};
	}

	const winner = inferTournamentWinnerFromMatchPointAndLastMap(
		teamScores,
		mapScores,
	);
	return {
		hasPlannedTournament: true,
		tournamentLabel: tournament.tournamentLabel,
		tournamentDate: tournament.tournamentDate,
		isInFuture: tournament.isInFuture,
		topFraggers,
		teamScores,
		mapScores,
		...(winner ? { tournamentWinner: winner } : {}),
		fetchedAt,
	};
}

export async function fetchDashboardFromSheets(): Promise<DashboardData> {
	const useDummy = process.env.DASHBOARD_USE_DUMMY_DATA === "true";

	if (useDummy && !canTrySheet()) {
		return getSampleDashboardData();
	}

	if (!canTrySheet()) {
		throw new Error(
			"Missing GOOGLE_SPREADSHEET_ID or GOOGLE_SERVICE_ACCOUNT_JSON. Copy .env.example to .env and configure Google Sheets access.",
		);
	}

	try {
		const data = await fetchSheetDashboard();
		if (
			useDummy &&
			isEmptyLeaderboards(data) &&
			data.hasPlannedTournament
		) {
			return getSampleDashboardData();
		}
		return data;
	} catch (e) {
		if (useDummy) {
			return getSampleDashboardData();
		}
		throw e;
	}
}
