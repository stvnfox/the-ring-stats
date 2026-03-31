import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { getDashboardRefetchInterval } from "#/lib/dashboard-refetch";
import type { LeaderboardRow, MapScoreBlock } from "#/lib/dashboard-types";
import { getDashboardData } from "#/server/get-dashboard-data";

export const Route = createFileRoute("/")({ component: HomeDashboard });

function formatScore(score: number | null) {
  if (score === null) return "—";
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function formatUpdatedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** Tournaments tab date cell: show as locale date when parseable, else raw */
function formatTournamentDate(raw: string | undefined) {
  if (!raw?.trim()) return null;
  const t = Date.parse(raw);
  if (!Number.isNaN(t)) {
    return new Date(t).toLocaleDateString(undefined, {
      dateStyle: "long",
    });
  }
  return raw.trim();
}

function HomeDashboard() {
  const fetchDashboard = useServerFn(getDashboardData);
  const { data, isLoading, error, dataUpdatedAt, isFetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDashboard(),
    refetchInterval: getDashboardRefetchInterval,
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
          Loading spreadsheet…
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
        <>
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <LeaderboardCard
              title="Top fraggers"
              description="Individual scores per player."
              rows={data.topFraggers}
              scoreHeader="Score"
              emptyHint="No scores available yet. Will be updated when the event starts."
            />
            <LeaderboardCard
              title="Team leaderboard"
              description="Total scores per team."
              rows={data.teamScores}
              scoreHeader="Points"
              showMatchPoint
              emptyHint="No team scores available yet. Will be updated when the event starts."
            />
          </div>

          <section className="mt-12 w-full max-w-[min(100%,120rem)]">
            <h2 className="mb-2 text-lg font-semibold text-[var(--sea-ink)]">
              Map scores
            </h2>
            <p className="mb-6 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
              Per-map scores for each team.
            </p>
            {data.mapScores.length > 0 ? (
              <Tabs defaultValue="map-0" className="w-full">
                <TabsList
                  variant="line"
                  className="mb-4 h-auto w-full flex-wrap justify-start gap-1 p-0"
                >
                  {data.mapScores.map((m, i) => (
                    <TabsTrigger
                      key={m.mapName}
                      value={`map-${i}`}
                      className="shrink-0 data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--sea-ink)]"
                    >
                      Map {i + 1}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {data.mapScores.map((m, i) => (
                  <TabsContent
                    key={m.mapName}
                    value={`map-${i}`}
                    className="mt-0 w-full outline-none"
                  >
                    <MapScoresTable map={m} />
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="island-shell rounded-2xl p-6 text-sm text-[var(--sea-ink-soft)]">
                <p className="m-0 font-medium text-[var(--sea-ink)]">
                  No map data yet
                </p>
                <p className="mt-2 mb-0">
                  No map data available yet. Will be updated when the event
                  starts.
                </p>
              </div>
            )}
          </section>
        </>
      )}

      {/* {data?.hasPlannedTournament && data.tournamentLabel && (
				<p className="mt-8 text-center text-sm text-[var(--sea-ink-soft)]">
					Next up:{" "}
					<span className="font-medium text-[var(--sea-ink)]">
						{data.tournamentLabel}
					</span>
				</p>
			)} */}

      {data && dataUpdatedAt != null && (
        <p className="mt-6 text-center text-xs text-[var(--sea-ink-soft)] opacity-80">
          Data last updated{" "}
          {formatUpdatedAt(new Date(dataUpdatedAt).toISOString())}
        </p>
      )}
    </main>
  );
}

function MapScoresTable({ map }: { map: MapScoreBlock }) {
  const maxSlots = Math.max(0, ...map.teams.map((t) => t.playerScores.length));

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
      <Table>
        <TableHeader>
          <TableRow className="border-[var(--line)] hover:bg-transparent">
            <TableHead className="w-12 min-w-[3rem] text-[var(--sea-ink)]">
              #
            </TableHead>
            <TableHead className="min-w-[8rem] text-[var(--sea-ink)]">
              Team
            </TableHead>
            {maxSlots > 0
              ? Array.from({ length: maxSlots }, (_, i) => i + 1).map((n) => (
                  <TableHead
                    key={`ph-${map.mapName}-p${n}`}
                    className="min-w-[6.5rem] text-[var(--sea-ink)]"
                  >
                    Player {n}
                  </TableHead>
                ))
              : null}
            <TableHead className="min-w-[4.5rem] text-right text-[var(--sea-ink)]">
              Total
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {map.teams.map((t) => (
            <TableRow
              key={`${map.mapName}-${t.teamName}-${t.placement}`}
              className="border-[var(--line)]"
            >
              <TableCell className="font-medium text-[var(--sea-ink-soft)]">
                {t.placement}
              </TableCell>
              <TableCell className="font-semibold text-[var(--sea-ink)]">
                {t.teamName}
              </TableCell>
              {maxSlots > 0
                ? Array.from({ length: maxSlots }, (_, i) => i + 1).map((n) => {
                    const p = t.playerScores[n - 1];
                    return (
                      <TableCell
                        key={
                          p
                            ? `${t.teamName}-${p.name}-p${n}`
                            : `${t.teamName}-empty-p${n}`
                        }
                      >
                        {p ? (
                          <span className="flex flex-col gap-0.5 leading-tight">
                            <span className="text-muted-foreground text-xs">
                              {p.name}
                            </span>
                            <span className="tabular-nums text-[var(--sea-ink)]">
                              {formatScore(p.score)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[var(--sea-ink-soft)]">—</span>
                        )}
                      </TableCell>
                    );
                  })
                : null}
              <TableCell className="text-right text-base font-semibold tabular-nums text-[var(--sea-ink)]">
                {formatScore(t.total)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LeaderboardCard({
  title,
  description,
  rows,
  scoreHeader,
  showMatchPoint,
  emptyHint,
}: {
  title: string;
  description: string;
  rows: LeaderboardRow[];
  scoreHeader: string;
  showMatchPoint?: boolean;
  emptyHint: string;
}) {
  return (
    <Card className="border-[var(--line)] bg-[var(--surface)] text-[var(--sea-ink)] shadow-none backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg text-[var(--sea-ink)]">{title}</CardTitle>
        <CardDescription className="text-[var(--sea-ink-soft)]">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--sea-ink-soft)]">{emptyHint}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--line)] hover:bg-transparent">
                <TableHead className="w-14 text-[var(--sea-ink)]">#</TableHead>
                <TableHead className="text-[var(--sea-ink)]">Name</TableHead>
                <TableHead className="text-right text-[var(--sea-ink)]">
                  {scoreHeader}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={`${row.rank}-${row.name}`}
                  className="border-[var(--line)]"
                >
                  <TableCell className="font-medium text-[var(--sea-ink-soft)]">
                    {row.rank}
                  </TableCell>
                  <TableCell className="font-semibold text-[var(--sea-ink)]">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {row.name}
                      {showMatchPoint && row.onMatchPoint ? (
                        <span className="rounded-full border border-[var(--lagoon)]/45 bg-[rgba(79,184,178,0.14)] px-2 py-0.5 text-xs font-semibold tracking-wide text-[var(--lagoon-deep)] uppercase">
                          Match point
                        </span>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatScore(row.score)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
