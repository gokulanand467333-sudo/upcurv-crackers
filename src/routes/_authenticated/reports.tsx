import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Eye,
  IndianRupee,
  MousePointerClick,
  Percent,
  ShoppingBag,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminShell } from "@/components/admin-shell";
import { KpiCard } from "@/components/admin/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, type Enquiry } from "@/lib/admin";
import { inr } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Upcurv Crackers Seller Desk" },
      {
        name: "description",
        content: "Visitor activity, cart adds, top products, enquiry sources and revenue.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Reports — Upcurv Crackers Seller Desk" },
      { property: "og:description", content: "Shop performance analytics." },
    ],
  }),
  component: ReportsPage,
});

const RANGES = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
] as const;

const PALETTE = [
  "var(--report-blue)",
  "var(--report-teal)",
  "var(--report-green)",
  "var(--report-violet)",
  "var(--report-rose)",
];

const AXIS = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function tooltipStyle() {
  return {
    contentStyle: {
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      fontSize: 12,
      color: "var(--foreground)",
    },
    labelStyle: { color: "var(--muted-foreground)", fontSize: 11 },
  };
}

function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm ${className}`}
    >
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </header>
      <div className="min-w-0 p-3">{children}</div>
    </section>
  );
}

function Empty() {
  return <p className="py-12 text-center text-sm text-muted-foreground">No data in this period.</p>;
}

function ReportsPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("30");
  const days = Number(range);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const prevSince = new Date(Date.now() - days * 2 * 86400000).toISOString();

  const events = useQuery({
    queryKey: ["admin", "site_events", range],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_events")
        .select("*")
        .gte("created_at", prevSince)
        .order("created_at", { ascending: false })
        .limit(8000);
      if (error) throw error;
      return data;
    },
  });

  const enquiries = useQuery({
    queryKey: ["admin", "enquiries", "reports", range],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquiries")
        .select("*")
        .gte("created_at", prevSince)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Enquiry[];
    },
  });

  const loading = events.isLoading || enquiries.isLoading;
  const allEv = events.data ?? [];
  const allEnq = enquiries.data ?? [];

  const ev = allEv.filter((e) => e.created_at >= since);
  const enq = allEnq.filter((e) => e.created_at >= since);
  const prevEv = allEv.filter((e) => e.created_at < since);
  const prevEnq = allEnq.filter((e) => e.created_at < since);

  const pct = (now: number, before: number) =>
    before === 0 ? (now > 0 ? 100 : 0) : ((now - before) / before) * 100;

  const views = ev.filter((e) => e.kind === "page_view");
  const adds = ev.filter((e) => e.kind === "add_to_cart");
  const visitors = new Set(ev.map((e) => e.session_id)).size;
  const prevVisitors = new Set(prevEv.map((e) => e.session_id)).size;
  const prevAdds = prevEv.filter((e) => e.kind === "add_to_cart").length;
  const prevViews = prevEv.filter((e) => e.kind === "page_view").length;

  const enquirySessions = new Set(
    ev.filter((e) => e.kind === "enquiry_submit").map((e) => e.session_id),
  ).size;
  const conversion = visitors ? (enquirySessions / visitors) * 100 : 0;
  const prevEnquirySessions = new Set(
    prevEv.filter((e) => e.kind === "enquiry_submit").map((e) => e.session_id),
  ).size;
  const prevConversion = prevVisitors ? (prevEnquirySessions / prevVisitors) * 100 : 0;

  const won = (list: Enquiry[]) =>
    list.filter((e) => ["completed", "confirmed", "ready"].includes(e.status));
  const revenue = won(enq).reduce((s, e) => s + Number(e.estimated_value), 0);
  const prevRevenue = won(prevEnq).reduce((s, e) => s + Number(e.estimated_value), 0);
  const pipeline = enq.reduce((s, e) => s + Number(e.estimated_value), 0);
  const avgValue = enq.length ? Math.round(pipeline / enq.length) : 0;
  const prevAvg = prevEnq.length
    ? Math.round(prevEnq.reduce((s, e) => s + Number(e.estimated_value), 0) / prevEnq.length)
    : 0;
  const winRate = enq.length ? (won(enq).length / enq.length) * 100 : 0;
  const discount = enq.reduce((s, e) => s + Number(e.discount_amount ?? 0), 0);
  const items = enq.reduce((s, e) => s + Number(e.item_count ?? 0), 0);

  const group = <T,>(list: T[], key: (x: T) => string, val: (x: T) => number) => {
    const map = new Map<string, number>();
    for (const x of list) {
      const k = key(x) || "—";
      map.set(k, (map.get(k) ?? 0) + val(x));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };

  const topProducts = group(
    adds,
    (e) => e.product_name ?? "Unknown",
    (e) => Math.max(1, e.qty),
  )
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const bySource = group(
    enq,
    (e) => e.source,
    () => 1,
  ).map(([name, value]) => ({ name, value }));

  const revenueBySource = group(
    enq,
    (e) => e.source,
    (e) => Number(e.estimated_value),
  ).map(([name, value]) => ({ name, value }));

  const byStatus = group(
    enq,
    (e) => STATUS_LABEL[e.status],
    () => 1,
  ).map(([name, value]) => ({ name, value }));

  const byCity = group(
    enq,
    (e) => e.city,
    () => 1,
  )
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const byPath = group(
    views,
    (e) => e.path ?? "/",
    () => 1,
  )
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const daily = (() => {
    const map = new Map<string, { day: string; views: number; adds: number; enquiries: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      map.set(d, { day: d.slice(5), views: 0, adds: 0, enquiries: 0 });
    }
    for (const e of ev) {
      const row = map.get(e.created_at.slice(0, 10));
      if (!row) continue;
      if (e.kind === "page_view") row.views += 1;
      if (e.kind === "add_to_cart") row.adds += 1;
    }
    for (const e of enq) {
      const row = map.get(e.created_at.slice(0, 10));
      if (row) row.enquiries += 1;
    }
    return [...map.values()];
  })();

  const hourly = (() => {
    const rows = Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, "0")}h`,
      enquiries: 0,
    }));
    for (const e of enq) {
      const h = new Date(e.created_at).getHours();
      rows[h]!.enquiries += 1;
    }
    return rows;
  })();

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Visitors, cart activity and enquiry performance
          </p>
        </div>
        <div className="ml-auto flex rounded-lg border border-border bg-card p-0.5 text-xs">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                range === r.key
                  ? "bg-report-blue/10 text-report-blue"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="Visitors"
              value={String(visitors)}
              delta={pct(visitors, prevVisitors)}
              hint="vs previous period"
              tone="blue"
              icon={Users}
            />
            <KpiCard
              label="Page views"
              value={String(views.length)}
              delta={pct(views.length, prevViews)}
              tone="violet"
              icon={Eye}
            />
            <KpiCard
              label="Cart adds"
              value={String(adds.length)}
              delta={pct(adds.length, prevAdds)}
              tone="teal"
              icon={MousePointerClick}
            />
            <KpiCard
              label="Enquiries"
              value={String(enq.length)}
              delta={pct(enq.length, prevEnq.length)}
              hint={`${items} items`}
              tone="green"
              icon={ShoppingBag}
            />
            <KpiCard
              label="Conversion"
              value={`${conversion.toFixed(1)}%`}
              delta={pct(conversion, prevConversion)}
              hint="visitor → enquiry"
              tone="rose"
              icon={Percent}
            />
            <KpiCard
              label="Confirmed revenue"
              value={inr(revenue)}
              delta={pct(revenue, prevRevenue)}
              hint={`pipeline ${inr(pipeline)}`}
              tone="green"
              icon={IndianRupee}
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Avg enquiry value"
              value={inr(avgValue)}
              delta={pct(avgValue, prevAvg)}
              tone="blue"
            />
            <KpiCard label="Win rate" value={`${winRate.toFixed(0)}%`} tone="green" />
            <KpiCard label="Discount given" value={inr(discount)} tone="rose" />
            <KpiCard
              label="Items per enquiry"
              value={enq.length ? (items / enq.length).toFixed(1) : "0"}
              tone="violet"
            />
          </div>

          <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-3">
            <Panel
              title="Daily activity"
              subtitle="Page views, cart adds and enquiries"
              className="xl:col-span-2"
            >
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily} margin={{ top: 10, right: 8, bottom: 0, left: -18 }}>
                    <defs>
                      {["blue", "teal", "green"].map((c) => (
                        <linearGradient key={c} id={`g-${c}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={`var(--report-${c})`} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={`var(--report-${c})`} stopOpacity={0.02} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" interval="preserveStartEnd" minTickGap={16} {...AXIS} />
                    <YAxis allowDecimals={false} width={44} {...AXIS} />
                    <RTooltip {...tooltipStyle()} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="views"
                      name="Page views"
                      stroke="var(--report-blue)"
                      fill="url(#g-blue)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="adds"
                      name="Cart adds"
                      stroke="var(--report-teal)"
                      fill="url(#g-teal)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="enquiries"
                      name="Enquiries"
                      stroke="var(--report-green)"
                      fill="url(#g-green)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Enquiries by source" subtitle="Where customers come from">
              {bySource.length === 0 ? (
                <Empty />
              ) : (
                <div className="h-72 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bySource}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="50%"
                        outerRadius="78%"
                        paddingAngle={2}
                      >
                        {bySource.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="var(--card)" />
                        ))}
                      </Pie>
                      <RTooltip {...tooltipStyle()} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Pipeline split" subtitle="Enquiries by current status">
              {byStatus.length === 0 ? (
                <Empty />
              ) : (
                <div className="h-72 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byStatus}
                        dataKey="value"
                        nameKey="name"
                        outerRadius="78%"
                        paddingAngle={2}
                      >
                        {byStatus.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="var(--card)" />
                        ))}
                      </Pie>
                      <RTooltip {...tooltipStyle()} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel
              title="Top products added to cart"
              subtitle="Quantity added"
              className="xl:col-span-2"
            >
              {topProducts.length === 0 ? (
                <Empty />
              ) : (
                <div className="h-72 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topProducts}
                      layout="vertical"
                      margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        horizontal={false}
                      />
                      <XAxis type="number" allowDecimals={false} {...AXIS} />
                      <YAxis type="category" dataKey="name" width={130} {...AXIS} />
                      <RTooltip {...tooltipStyle()} cursor={{ fill: "var(--muted)" }} />
                      <Bar dataKey="value" name="Added" radius={[0, 6, 6, 0]} barSize={14}>
                        {topProducts.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Revenue by source" subtitle="Estimated enquiry value">
              {revenueBySource.length === 0 ? (
                <Empty />
              ) : (
                <div className="h-72 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={revenueBySource}
                      margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                      />
                      <XAxis dataKey="name" {...AXIS} />
                      <YAxis width={54} {...AXIS} />
                      <RTooltip
                        {...tooltipStyle()}
                        cursor={{ fill: "var(--muted)" }}
                        formatter={(v: number) => inr(Number(v))}
                      />
                      <Bar dataKey="value" name="Value" radius={[6, 6, 0, 0]} barSize={26}>
                        {revenueBySource.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Enquiries by hour" subtitle="Best time to call back">
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourly} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="hour" interval={3} {...AXIS} />
                    <YAxis allowDecimals={false} width={40} {...AXIS} />
                    <RTooltip {...tooltipStyle()} />
                    <Line
                      type="monotone"
                      dataKey="enquiries"
                      stroke="var(--report-violet)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Top cities" subtitle="Enquiries by customer city">
              {byCity.length === 0 ? (
                <Empty />
              ) : (
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={byCity}
                      layout="vertical"
                      margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        horizontal={false}
                      />
                      <XAxis type="number" allowDecimals={false} {...AXIS} />
                      <YAxis type="category" dataKey="name" width={100} {...AXIS} />
                      <RTooltip {...tooltipStyle()} cursor={{ fill: "var(--muted)" }} />
                      <Bar
                        dataKey="value"
                        name="Enquiries"
                        fill="var(--report-teal)"
                        radius={[0, 6, 6, 0]}
                        barSize={14}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Most viewed pages" subtitle="Page views in this period">
              {byPath.length === 0 ? (
                <Empty />
              ) : (
                <ul className="divide-y divide-border">
                  {byPath.map((p, i) => (
                    <li key={p.name} className="flex items-center gap-3 py-2 text-sm">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: PALETTE[i % PALETTE.length] }}
                      />
                      <span className="truncate">{p.name}</span>
                      <span className="ml-auto shrink-0 font-semibold tabular-nums">{p.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </AdminShell>
  );
}
