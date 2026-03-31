import type { Query } from "@tanstack/react-query";

import type { DashboardData } from "#/lib/dashboard-types";

const DEFAULT_MS = 30_000;

/** Polling interval from env. `0` = disabled (no automatic refetch). */
export function getDashboardRefetchIntervalMs(): number {
	const raw = import.meta.env.VITE_DASHBOARD_REFETCH_MS;
	if (raw === undefined || raw === "") return DEFAULT_MS;
	const n = Number.parseInt(String(raw), 10);
	if (!Number.isFinite(n) || n < 0) return DEFAULT_MS;
	return n;
}

/**
 * When true, poll even if `hasPlannedTournament` is false (e.g. empty schedule).
 * Default false: saves API quota outside active events.
 */
export function getPollWhenIdle(): boolean {
	return import.meta.env.VITE_DASHBOARD_POLL_WHEN_IDLE === "true";
}

/**
 * React Query `refetchInterval` callback: respects interval env, and pauses when
 * there is no planned tournament unless `VITE_DASHBOARD_POLL_WHEN_IDLE=true`.
 */
export function getDashboardRefetchInterval(
	query: Query<DashboardData>,
): number | false {
	const ms = getDashboardRefetchIntervalMs();
	if (ms <= 0) return false;

	const d = query.state.data;
	if (!getPollWhenIdle() && d && !d.hasPlannedTournament) return false;

	return ms;
}
