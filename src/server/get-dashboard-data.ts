import { createServerFn } from "@tanstack/react-start";

import type { DashboardData } from "#/lib/dashboard-types";

export const getDashboardData = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardData> => {
		const { fetchDashboardFromSheets } = await import(
			"#/server/sheets-service"
		);
		return fetchDashboardFromSheets();
	},
);
