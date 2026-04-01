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
import type { DashboardData, LeaderboardRow, MapScoreBlock } from "#/lib/dashboard-types";
import { parseTournamentSheetDateToYmd } from "#/lib/tournament-sheet-date";

export function formatScore(score: number | null) {
  if (score === null) return "—";
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

export function formatUpdatedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function formatTournamentDate(raw: string | undefined) {
  if (!raw?.trim()) return null;
  const ymd = parseTournamentSheetDateToYmd(raw);
  if (ymd) {
    return new Date(ymd.y, ymd.m - 1, ymd.d).toLocaleDateString(undefined, {
      dateStyle: "long",
    });
  }
  // Avoid Date.parse for d/m/y-looking strings: engines often use US M/D/Y (wrong for NL sheets).
  const looksLikeNumericDate = /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(
    raw.trim(),
  );
  if (!looksLikeNumericDate) {
    const t = Date.parse(raw.trim());
    if (!Number.isNaN(t)) {
      return new Date(t).toLocaleDateString(undefined, {
        dateStyle: "long",
      });
    }
  }
  return raw.trim();
}

export function DashboardLeaderboardsAndMaps({
  data,
  teamEmptyHint,
  fraggerEmptyHint,
  mapEmptyHint,
}: {
  data: DashboardData;
  teamEmptyHint: string;
  fraggerEmptyHint: string;
  mapEmptyHint: string;
}) {
  return (
    <>
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <LeaderboardCard
          title="Team leaderboard"
          description="Total scores per team."
          rows={data.teamScores}
          scoreHeader="Points"
          showMatchPoint
          emptyHint={teamEmptyHint}
        />
        <LeaderboardCard
          title="Top fraggers"
          description="Individual scores per player."
          rows={data.topFraggers}
          scoreHeader="Score"
          emptyHint={fraggerEmptyHint}
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
            <p className="m-0 font-medium text-[var(--sea-ink)]">No map data</p>
            <p className="mt-2 mb-0">{mapEmptyHint}</p>
          </div>
        )}
      </section>
    </>
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
