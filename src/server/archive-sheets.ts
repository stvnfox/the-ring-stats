import { google } from "googleapis";

import type { DashboardData } from "#/lib/dashboard-types";
import {
	parseMapScores,
	parseTeamScores,
	parseTopFraggers,
	splitStackedArchiveValues,
} from "#/server/sheets-parse";

function requireEnv(name: string): string {
	const v = process.env[name];
	if (!v?.trim()) {
		throw new Error(
			`Missing environment variable ${name}. Copy .env.example to .env and configure the archive spreadsheet.`,
		);
	}
	return v.trim();
}

function sheetRange(tabName: string): string {
	const escaped = tabName.replace(/'/g, "''");
	return `'${escaped}'!A:ZZ`;
}

function getSheets() {
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

	return google.sheets({ version: "v4", auth });
}

const DEFAULT_ARCHIVE_TAB_EXCLUDES = ["_Template", "Template", "README"];

function parseExcludeList(): string[] {
	const raw = process.env.SHEET_ARCHIVE_TAB_EXCLUDE;
	if (raw === undefined || raw.trim() === "") return DEFAULT_ARCHIVE_TAB_EXCLUDES;
	return raw
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

function tabTitleAllowed(title: string): boolean {
	const prefix = process.env.SHEET_ARCHIVE_TAB_PREFIX?.trim();
	if (prefix && !title.startsWith(prefix)) return false;
	const exclude = parseExcludeList();
	return !exclude.some((ex) => title === ex);
}

export type ArchiveTabRef = { tabTitle: string };

export async function listArchiveTournamentTabs(): Promise<ArchiveTabRef[]> {
	const spreadsheetId = requireEnv("GOOGLE_ARCHIVE_SPREADSHEET_ID");
	const sheets = getSheets();

	const res = await sheets.spreadsheets.get({
		spreadsheetId,
		fields: "sheets.properties.title",
	});

	const titles = (res.data.sheets ?? [])
		.map((s) => s.properties?.title)
		.filter((t): t is string => Boolean(t?.trim()));

	const filtered = titles.filter(tabTitleAllowed);
	filtered.sort((a, b) => a.localeCompare(b));

	return filtered.map((tabTitle) => ({ tabTitle }));
}

export async function tabExistsInArchive(tabTitle: string): Promise<boolean> {
	const tabs = await listArchiveTournamentTabs();
	return tabs.some((t) => t.tabTitle === tabTitle);
}

export async function fetchArchiveDashboardByTab(
	tabTitle: string,
): Promise<DashboardData> {
	const trimmed = tabTitle.trim();
	if (!trimmed || trimmed.length > 200) {
		throw new Error("Invalid archive tab title.");
	}

	if (!(await tabExistsInArchive(trimmed))) {
		throw new Error(`Unknown archive tournament tab: ${trimmed}`);
	}

	const spreadsheetId = requireEnv("GOOGLE_ARCHIVE_SPREADSHEET_ID");
	const sheets = getSheets();

	const res = await sheets.spreadsheets.values.batchGet({
		spreadsheetId,
		ranges: [sheetRange(trimmed)],
	});

	const values = res.data.valueRanges?.[0]?.values as
		| string[][]
		| undefined;

	const split = splitStackedArchiveValues(values);

	const topFraggers = parseTopFraggers(split.players);
	const teamScores = parseTeamScores(split.teams);
	const mapScores = parseMapScores(split.maps);

	return {
		hasPlannedTournament: true,
		tournamentLabel: split.eventLabel ?? trimmed,
		tournamentDate: split.eventDate,
		isInFuture: false,
		topFraggers,
		teamScores,
		mapScores,
		fetchedAt: new Date().toISOString(),
	};
}
