import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  DashboardLeaderboardsAndMaps,
  formatTournamentDate,
  formatUpdatedAt,
} from "#/components/DashboardPanels";
import {
  getDashboardRefetchInterval,
  isDashboardAutoRefetchDisabled,
} from "#/lib/dashboard-refetch";
import { getDashboardData } from "#/server/get-dashboard-data";

export const Route = createFileRoute("/")({ component: HomeDashboard });

function HomeDashboard() {
  const fetchDashboard = useServerFn(getDashboardData);
  const noAutoRefetch = isDashboardAutoRefetchDisabled();
  const { data, isLoading, error, dataUpdatedAt, isFetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDashboard(),
    refetchInterval: getDashboardRefetchInterval,
    refetchOnWindowFocus: !noAutoRefetch,
    refetchOnReconnect: !noAutoRefetch,
  });

  const errMessage =
    error instanceof Error ? error.message : "Failed to load dashboard.";

  return (
    <main className="page-wrap px-4 pb-12 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">The Ring by InferX</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl">
          <span className="block">Tourney stats</span>
          {data?.hasPlannedTournament &&
            (data.tournamentLabel || data.tournamentDate) && (
              <span className="mt-3 block text-2xl font-semibold tracking-tight text-[var(--sea-ink)] sm:text-3xl">
                {[
                  data.tournamentLabel,
                  formatTournamentDate(data.tournamentDate),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
        </h1>
        <p className="mb-6 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Top fraggers, overall team standings, and per-map scores update
          automatically.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--sea-ink-soft)]">
          {data && (
            <span className="italic text-[var(--sea-ink-soft)]">
              Last synced{" "}
              <time dateTime={data.fetchedAt}>
                {formatUpdatedAt(data.fetchedAt)}
              </time>
              {isFetching ? " · refreshing…" : ""}
            </span>
          )}
        </div>
      </section>

      {isLoading && (
        <p className="mt-10 text-center text-[var(--sea-ink-soft)]">
          Loading data...
        </p>
      )}

      {error && (
        <div
          className="mt-10 rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive"
          role="alert"
        >
          <p className="m-0 font-semibold">Could not load data</p>
          <p className="mt-2 text-pretty opacity-90">{errMessage}</p>
        </div>
      )}

      {data && !data.hasPlannedTournament && (
        <section className="island-shell mt-10 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold text-[var(--sea-ink)]">
            No tournament planned
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[var(--sea-ink-soft)]">
            There isn’t an upcoming or active event right now. Leaderboards will
            show up here when one is planned.
          </p>
        </section>
      )}

      {data?.hasPlannedTournament && (
        <DashboardLeaderboardsAndMaps
          data={data}
          teamEmptyHint="No team scores available yet. Will be updated when the event starts."
          fraggerEmptyHint="No scores available yet. Will be updated when the event starts."
          mapEmptyHint="No map data available yet. Will be updated when the event starts."
        />
      )}

      {data && dataUpdatedAt != null && (
        <p className="mt-6 text-center text-xs text-[var(--sea-ink-soft)] opacity-80">
          Data last updated{" "}
          {formatUpdatedAt(new Date(dataUpdatedAt).toISOString())}
        </p>
      )}
    </main>
  );
}
