import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import {
  DashboardLeaderboardsAndMaps,
  formatTournamentDate,
  formatUpdatedAt,
} from "#/components/DashboardPanels";
import { getArchiveDashboardData } from "#/server/get-archive-dashboard-data";
import { listArchiveTournaments } from "#/server/list-archive-tournaments";

export const Route = createFileRoute("/archive")({
  validateSearch: (search: Record<string, unknown>) => ({
    t:
      typeof search.t === "string" && search.t.trim().length > 0
        ? search.t.trim()
        : undefined,
  }),
  component: ArchivePage,
});

function ArchivePage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { t: searchTab } = Route.useSearch();

  const listFn = useServerFn(listArchiveTournaments);
  const archiveDataFn = useServerFn(getArchiveDashboardData);

  const {
    data: tabs,
    isLoading: tabsLoading,
    error: tabsError,
  } = useQuery({
    queryKey: ["archive", "tabs"],
    queryFn: () => listFn(),
  });

  const titles = useMemo(() => tabs?.map((x) => x.tabTitle) ?? [], [tabs]);

  const selectedTab = useMemo(() => {
    if (searchTab && titles.includes(searchTab)) return searchTab;
    return "";
  }, [searchTab, titles]);

  const {
    data,
    isLoading: dataLoading,
    error: dataError,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["archive", "dashboard", selectedTab],
    queryFn: () => archiveDataFn({ data: { tabTitle: selectedTab } }),
    enabled: Boolean(selectedTab),
  });

  const tabsErr =
    tabsError instanceof Error ? tabsError.message : "Could not list archives.";
  const dataErr =
    dataError instanceof Error
      ? dataError.message
      : "Could not load archive data.";

  return (
    <main className="page-wrap px-4 pb-12 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">The Ring by InferX</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl">
          <span className="block">Archived tournaments</span>
          {data && (data.tournamentLabel || data.tournamentDate) && (
            <span className="mt-3 block text-2xl font-semibold tracking-tight text-[var(--sea-ink)] sm:text-3xl">
              {[data.tournamentLabel, formatTournamentDate(data.tournamentDate)]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
        </h1>
        <p className="mb-6 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Show archived tournament data.
        </p>

        <div className="flex max-w-md flex-col gap-2">
          <label
            htmlFor="archive-tournament"
            className="text-sm font-medium text-[var(--sea-ink)]"
          >
            Tournament
          </label>
          <select
            id="archive-tournament"
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--sea-ink)]"
            disabled={tabsLoading || titles.length === 0}
            value={tabsLoading ? "" : selectedTab}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                navigate({ to: "/archive", search: { t: undefined } });
                return;
              }
              navigate({ to: "/archive", search: { t: v } });
            }}
          >
            <option value="" disabled={tabsLoading || titles.length === 0}>
              {tabsLoading
                ? "Pick a tournament"
                : titles.length === 0
                  ? "No archived tabs"
                  : "Pick a tournament"}
            </option>
            {titles.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
        </div>

        {data && (
          <p className="mt-4 text-sm text-[var(--sea-ink-soft)]">
            Loaded{" "}
            <time dateTime={data.fetchedAt}>
              {formatUpdatedAt(data.fetchedAt)}
            </time>
          </p>
        )}
      </section>

      {tabsLoading && (
        <p className="mt-10 text-center text-[var(--sea-ink-soft)]">
          Loading archive list…
        </p>
      )}

      {tabsError && (
        <div
          className="mt-10 rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive"
          role="alert"
        >
          <p className="m-0 font-semibold">Archive list unavailable</p>
          <p className="mt-2 mb-0 text-pretty opacity-90">{tabsErr}</p>
        </div>
      )}

      {!tabsLoading && !tabsError && titles.length === 0 && (
        <section className="island-shell mt-10 rounded-2xl p-8 text-center">
          <p className="text-[var(--sea-ink-soft)]">
            No tournament tabs found. Set{" "}
            <code className="text-[var(--sea-ink)]">
              GOOGLE_ARCHIVE_SPREADSHEET_ID
            </code>{" "}
            and add tabs to the archive spreadsheet (see stacked layout in code
            comments).
          </p>
        </section>
      )}

      {selectedTab && dataLoading && (
        <p className="mt-10 text-center text-[var(--sea-ink-soft)]">
          Loading tournament data…
        </p>
      )}

      {dataError && selectedTab && (
        <div
          className="mt-10 rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive"
          role="alert"
        >
          <p className="m-0 font-semibold">Could not load tournament</p>
          <p className="mt-2 mb-0 text-pretty opacity-90">{dataErr}</p>
        </div>
      )}

      {data && !dataLoading && (
        <DashboardLeaderboardsAndMaps
          data={data}
          teamEmptyHint="No team rows in this archive tab."
          fraggerEmptyHint="No player rows in this archive tab."
          mapEmptyHint="No map rows in this archive tab."
        />
      )}

      {data && dataUpdatedAt != null && (
        <p className="mt-6 text-center text-xs text-[var(--sea-ink-soft)] opacity-80">
          Viewed at {formatUpdatedAt(new Date(dataUpdatedAt).toISOString())}
        </p>
      )}
    </main>
  );
}
