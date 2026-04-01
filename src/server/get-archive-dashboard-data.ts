import { createServerFn } from "@tanstack/react-start";

import type { DashboardData } from "#/lib/dashboard-types";

export const getArchiveDashboardData = createServerFn({ method: "POST" })
	.inputValidator((data: unknown): { tabTitle: string } => {
		if (!data || typeof data !== "object" || data === null) {
			throw new Error("Invalid request body");
		}
		const tabTitle = (data as { tabTitle?: unknown }).tabTitle;
		if (typeof tabTitle !== "string") {
			throw new Error("tabTitle must be a string");
		}
		const trimmed = tabTitle.trim();
		if (!trimmed) {
			throw new Error("tabTitle is required");
		}
		return { tabTitle: trimmed };
	})
	.handler(async ({ data }): Promise<DashboardData> => {
		const { fetchArchiveDashboardByTab } = await import(
			"#/server/archive-sheets"
		);
		return fetchArchiveDashboardByTab(data.tabTitle);
	});
