import { createServerFn } from "@tanstack/react-start";

import type { ArchiveTabRef } from "#/server/archive-sheets";

export const listArchiveTournaments = createServerFn({ method: "GET" }).handler(
	async (): Promise<ArchiveTabRef[]> => {
		const { listArchiveTournamentTabs } = await import(
			"#/server/archive-sheets"
		);
		return listArchiveTournamentTabs();
	},
);
