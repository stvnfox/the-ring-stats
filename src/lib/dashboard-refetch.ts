import type { Query } from "@tanstack/react-query";

import type { DashboardData } from "#/lib/dashboard-types";

const DEFAULT_MS = 30_000;

/** Polling interval from env. `0` = disabled (no timer; use `isDashboardAutoRefetchDisabled()` for other defaults). */
export function getDashboardRefetchIntervalMs(): number {
	const raw = import.meta.env.VITE_DASHBOARD_REFETCH_MS;
	if (raw === undefined || raw === "") return DEFAULT_MS;

	const s = String(raw).trim().toLowerCase();
	if (s === "false" || s === "off" || s === "no") return 0;

	const n = Number.parseInt(s, 10);
	if (!Number.isFinite(n) || n < 0) return DEFAULT_MS;
	return n;
}

/** True when `VITE_DASHBOARD_REFETCH_MS` is 0 (or false/off/no): no poll timer and no focus/reconnect refetches. */
export function isDashboardAutoRefetchDisabled(): boolean {
	return getDashboardRefetchIntervalMs() <= 0;
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
