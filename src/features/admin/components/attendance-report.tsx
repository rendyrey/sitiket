"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPrice } from "@/data/events";
import { formatEventDate, formatEventTime } from "@/features/events/lib/format";
import type { EventAttendanceReport } from "@/lib/api/types";

/**
 * Organizer view of "did the people who bought tickets actually turn up?".
 *
 * Colour is the *emphasis* pattern, not a categorical palette: one accent hue
 * for the thing being measured (scanned in) and a de-emphasis gray for the
 * remainder (didn't show). Both live on the ink surface, where the brand lime
 * clears 3:1 contrast comfortably — it does not on the light paper surface,
 * which is why every chart here sits on a dark panel.
 */
const SCANNED = "#b6ff00"; // brand lime — the measured quantity
const ABSENT = "#7a7a70"; // de-emphasis gray — the remainder
const SURFACE = "#0a0a0a"; // the ink panel behind every chart; doubles as the inter-segment gap
const AXIS = "#8b8b83";
const GRID = "rgba(255,255,255,0.10)";

/** Time-of-day for a bucket boundary, e.g. `"18:15 WIB"`. */
const bucketLabel = (iso: string) => formatEventTime(iso);

const percent = (fraction: number) => `${Math.round(fraction * 1000) / 10}%`;

/** Brutalist tooltip — white card, hard black border, no shadow blur. */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="border-2 border-ink bg-white px-3 py-2 text-black">
      {label && <p className="text-[10px] font-black uppercase tracking-widest text-black/50">{label}</p>}
      <ul className="mt-1 space-y-0.5">
        {payload.map((entry) => (
          <li key={entry.dataKey ?? entry.name} className="flex items-center gap-2 text-xs font-bold">
            <span aria-hidden className="inline-block h-2.5 w-2.5 border border-ink" style={{ background: entry.color }} />
            <span>{entry.name}</span>
            <span className="ml-auto font-black tabular-nums">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One headline number in the KPI row. */
function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border-2 border-ink bg-white p-4 sm:p-5">
      <span className="text-[10px] font-black uppercase tracking-[.16em] text-black/45">{label}</span>
      <p className="mt-2 text-3xl font-black tabular-nums leading-none sm:text-4xl">{value}</p>
      {hint && <p className="mt-2 text-[11px] font-semibold leading-4 text-black/50">{hint}</p>}
    </div>
  );
}

/** A dark chart card. Every chart sits on ink so the lime accent stays legible. */
function ChartPanel({
  title,
  subtitle,
  children,
  legend,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  legend?: React.ReactNode;
}) {
  return (
    <section className="border-2 border-ink bg-ink p-5 text-white sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wide sm:text-xl">{title}</h2>
          {subtitle && <p className="mt-1.5 text-xs font-semibold text-white/50">{subtitle}</p>}
        </div>
        {legend}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** Shared legend swatch — identity is never carried by colour alone. */
function LegendKey({ items }: { items: Array<{ color: string; label: string }> }) {
  return (
    <ul className="flex flex-wrap items-center gap-4">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/70">
          <span aria-hidden className="inline-block h-3 w-3" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export default function AttendanceReport({ report }: { report: EventAttendanceReport }) {
  const {
    ticketsSold,
    checkedIn,
    notArrived,
    voided,
    attendanceRate,
    revenue,
    byTicketType,
    arrivals,
    bucketMinutes,
    firstCheckInAt,
    lastCheckInAt,
    peakBucket,
    byScanner,
  } = report;

  const hasSales = ticketsSold > 0;
  const hasScans = checkedIn > 0;

  // Nothing sold yet — a chart of zeroes is noise, so say so plainly instead.
  if (!hasSales) {
    return (
      <div className="border-2 border-ink bg-white p-8 text-center sm:p-12">
        <p className="text-lg font-black uppercase">No tickets sold yet</p>
        <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-black/55">
          Once this event starts selling, this page compares how many tickets went out against how many people
          actually scanned in at the gate.
        </p>
      </div>
    );
  }

  const typeRows = byTicketType.map((row) => ({
    ...row,
    notArrived: row.sold - row.checkedIn,
    rate: row.sold === 0 ? 0 : row.checkedIn / row.sold,
  }));

  const arrivalRows = arrivals.map((bucket) => ({ ...bucket, label: bucketLabel(bucket.startsAt) }));

  return (
    <div className="space-y-8">
      {/* ---- Headline: the one number this page exists to answer ---- */}
      <section className="border-2 border-ink bg-ink p-6 text-white sm:p-9">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[.2em] text-lime">Turnout</span>
            <p className="mt-3 font-lexend text-6xl font-black leading-none tabular-nums text-lime sm:text-7xl">
              {percent(attendanceRate)}
            </p>
            <p className="mt-4 text-sm font-bold text-white/70">
              <span className="text-white">{checkedIn.toLocaleString("id-ID")}</span> of{" "}
              <span className="text-white">{ticketsSold.toLocaleString("id-ID")}</span> tickets scanned in at the gate
            </p>
            {hasScans && firstCheckInAt && lastCheckInAt && (
              <p className="mt-1.5 text-xs font-semibold text-white/45">
                Gate active {formatEventTime(firstCheckInAt)} – {formatEventTime(lastCheckInAt)} ·{" "}
                {formatEventDate(firstCheckInAt)}
              </p>
            )}
          </div>

          {/* Meter: one ratio against its limit. Same two roles as every chart below. */}
          <div className="w-full lg:max-w-md">
            <div
              className="flex h-10 w-full overflow-hidden border-2 border-white/25"
              role="img"
              aria-label={`${checkedIn} of ${ticketsSold} tickets scanned in, ${percent(attendanceRate)}`}
            >
              <div style={{ width: `${attendanceRate * 100}%`, background: SCANNED }} />
              {/* 2px surface gap between adjacent fills */}
              {checkedIn > 0 && notArrived > 0 && <div className="w-0.5 shrink-0 bg-ink" />}
              <div className="flex-1" style={{ background: ABSENT }} />
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-3 text-[10px] font-black uppercase tracking-widest">
              <span className="text-lime">Scanned in · {checkedIn.toLocaleString("id-ID")}</span>
              <span className="text-white/55">Didn&apos;t show · {notArrived.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- KPI row ---- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Tickets sold" value={ticketsSold.toLocaleString("id-ID")} hint="Valid tickets, refunds excluded" />
        <StatTile label="Scanned in" value={checkedIn.toLocaleString("id-ID")} hint="Unique gate check-ins" />
        <StatTile
          label="Didn't show"
          value={notArrived.toLocaleString("id-ID")}
          hint={`${percent(ticketsSold === 0 ? 0 : notArrived / ticketsSold)} of tickets sold`}
        />
        <StatTile
          label="Revenue"
          value={formatPrice(revenue)}
          hint={voided > 0 ? `${voided.toLocaleString("id-ID")} ticket(s) refunded & voided` : "From paid orders"}
        />
      </div>

      {/* ---- Turnout by ticket type ---- */}
      {typeRows.length > 0 && (
        <ChartPanel
          title="Turnout by ticket type"
          subtitle="Each bar is one tier's tickets sold, split by who actually arrived."
          legend={
            <LegendKey
              items={[
                { color: SCANNED, label: "Scanned in" },
                { color: ABSENT, label: "Didn't show" },
              ]}
            />
          }
        >
          <div style={{ height: Math.max(140, typeRows.length * 64 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeRows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barSize={26}>
                <CartesianGrid horizontal={false} stroke={GRID} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  stroke={AXIS}
                  tick={{ fill: AXIS, fontSize: 11, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={128}
                  stroke={AXIS}
                  tick={{ fill: "#ffffff", fontSize: 11, fontWeight: 800 }}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.06)" }} />
                <Bar
                  dataKey="checkedIn"
                  name="Scanned in"
                  stackId="tickets"
                  fill={SCANNED}
                  stroke={SURFACE}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="notArrived"
                  name="Didn't show"
                  stackId="tickets"
                  fill={ABSENT}
                  stroke={SURFACE}
                  strokeWidth={2}
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table view: the same numbers, readable without colour vision or a mouse. */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-white/20 text-[10px] font-black uppercase tracking-widest text-white/45">
                  <th scope="col" className="py-2 pr-4">Ticket type</th>
                  <th scope="col" className="py-2 pr-4 text-right">Sold</th>
                  <th scope="col" className="py-2 pr-4 text-right">Scanned</th>
                  <th scope="col" className="py-2 pr-4 text-right">Didn&apos;t show</th>
                  <th scope="col" className="py-2 text-right">Turnout</th>
                </tr>
              </thead>
              <tbody>
                {typeRows.map((row) => (
                  <tr key={row.ticketTypeId} className="border-b border-white/10 text-sm font-bold">
                    <td className="py-2.5 pr-4">
                      {row.name}
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                        {formatPrice(row.price)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{row.sold}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-lime">{row.checkedIn}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-white/60">{row.notArrived}</td>
                    <td className="py-2.5 text-right tabular-nums">{percent(row.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartPanel>
      )}

      {/* ---- Arrivals over time ---- */}
      <ChartPanel
        title="Arrivals at the gate"
        subtitle={
          peakBucket
            ? `Scans per ${bucketMinutes} minutes. Busiest stretch: ${bucketLabel(peakBucket.startsAt)} with ${peakBucket.arrivals} ${peakBucket.arrivals === 1 ? "arrival" : "arrivals"}.`
            : `Scans per ${bucketMinutes} minutes.`
        }
      >
        {hasScans ? (
          <div className="h-[260px] w-full sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={arrivalRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis
                  dataKey="label"
                  stroke={AXIS}
                  tick={{ fill: AXIS, fontSize: 10, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  stroke={AXIS}
                  tick={{ fill: AXIS, fontSize: 11, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  width={36}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.06)" }} />
                <Bar dataKey="arrivals" name="Arrivals" fill={SCANNED} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {/* Emphasis: the peak bucket keeps full lime, the rest step back slightly. */}
                  {arrivalRows.map((row) => (
                    <Cell
                      key={row.startsAt}
                      fill={SCANNED}
                      fillOpacity={peakBucket && row.startsAt === peakBucket.startsAt ? 1 : 0.72}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-10 text-center text-sm font-bold text-white/45">
            No one has scanned in yet. This fills in live as gate staff scan tickets.
          </p>
        )}
      </ChartPanel>

      {/* ---- Who scanned ---- */}
      {byScanner.length > 0 && (
        <section className="border-2 border-ink bg-white p-5 sm:p-7">
          <h2 className="text-lg font-black uppercase tracking-wide sm:text-xl">Who scanned</h2>
          <p className="mt-1.5 text-xs font-semibold text-black/50">Check-ins credited to each gate-staff account.</p>
          <ul className="mt-6 space-y-4">
            {byScanner.map((scanner) => {
              const share = checkedIn === 0 ? 0 : scanner.scans / checkedIn;
              return (
                <li key={scanner.userId ?? scanner.name}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-black uppercase">{scanner.name}</span>
                    <span className="text-xs font-bold tabular-nums text-black/55">
                      {scanner.scans.toLocaleString("id-ID")} {scanner.scans === 1 ? "scan" : "scans"} · {percent(share)}
                    </span>
                  </div>
                  {scanner.email && <p className="mt-0.5 text-[11px] font-medium text-black/40">{scanner.email}</p>}
                  <div className="mt-2 h-3 w-full border-2 border-ink bg-paper">
                    <div className="h-full" style={{ width: `${share * 100}%`, background: SCANNED }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
