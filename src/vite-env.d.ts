/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_DASHBOARD_REFETCH_MS?: string;
	/** When `true`, keep polling even if Tournaments tab says no event. Default: off (only poll while a tourney is active). */
	readonly VITE_DASHBOARD_POLL_WHEN_IDLE?: string;
}
