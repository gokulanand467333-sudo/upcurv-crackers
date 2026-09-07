import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Enquiry } from "@/lib/admin";
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
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
] as const;

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Bars({ rows }: { rows: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0)
    return <p className="p-6 text-center text-sm text-muted-foreground">No data yet.</p>;
  return (
    <div className="space-y-3 p-4">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 font-semibold">{r.sub ?? r.value}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportsPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("30");
  const since = new Date(Date.now() - Number(range) * 86400000).toISOString();

  const events = useQuery({
    queryKey: ["admin", "site_events", range],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_events")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
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
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Enquiry[];
    },
  });

  const loading = events.isLoading || enquiries.isLoading;
  const ev = events.data ?? [];
  const enq = enquiries.data ?? [];

  const views = ev.filter((e) => e.kind === "page_view");
  const adds = ev.filter((e) => e.kind === "add_to_cart");
  const visitors = new Set(ev.map((e) => e.session_id)).size;
  const enquirySessions = new Set(ev.filter((e) => e.kind === "enquiry_submit").map((e) => e.session_id)).size;
  const conversion = visitors ? Math.round((enquirySessions / visitors) * 100) : 0;

  const revenue = enq
    .filter((e) => e.status === "completed" || e.status === "confirmed" || e.status === "ready")
    .reduce((s, e) => s + Number(e.estimated_value), 0);
  const pipeline = enq.reduce((s, e) => s + Number(e.estimated_value), 0);
  const avgValue = enq.length ? Math.round(pipeline / enq.length) : 0;

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
  ).slice(0, 8);

  const bySource = group(
    enq,
    (e) => e.source,
    () => 1,
  );
  const revenueBySource = new Map(
    group(
      enq,
      (e) => e.source,
      (e) => Number(e.estimated_value),
    ),
  );

  const byPath = group(
    views,
    (e) => e.path ?? "/",
    () => 1,
  ).slice(0, 8);

  const daily = (() => {
    const map = new Map<string, { views: number; adds: number; enq: number }>();
    for (let i = Number(range) - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      map.set(d, { views: 0, adds: 0, enq: 0 });
    }
    for (const e of ev) {
      const d = e.created_at.slice(0, 10);
      const row = map.get(d);
      if (!row) continue;
      if (e.kind === "page_view") row.views += 1;
      if (e.kind === "add_to_cart") row.adds += 1;
    }
    for (const e of enq) {
      const row = map.get(e.created_at.slice(0, 10));
      if (row) row.enq += 1;
    }
    return [...map.entries()].slice(-14);
  })();
  const dailyMax = Math.max(1, ...daily.map(([, v]) => v.views));

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Visitors, cart activity and enquiry performance
          </p>
        </div>
        <div className="ml-auto flex rounded-full border border-border p-0.5 text-xs">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-full px-3 py-1.5 font-medium ${
                range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Card label="Visitors" value={String(visitors)} hint={`${views.length} page views`} />
            <Card label="Cart adds" value={String(adds.length)} />
            <Card label="Enquiries" value={String(enq.length)} />
            <Card label="Conversion" value={`${conversion}%`} hint="visitor → enquiry" />
            <Card label="Confirmed revenue" value={inr(revenue)} hint="confirmed + ready + done" />
            <Card label="Avg enquiry value" value={inr(avgValue)} hint={`pipeline ${inr(pipeline)}`} />
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-lg font-semibold">Daily activity</h2>
            <div className="mt-4 flex h-40 items-end gap-2">
              {daily.map(([day, v]) => (
                <div key={day} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-32 w-full items-end justify-center gap-0.5">
                    <div
                      title={`${v.views} views`}
                      className="w-1/3 rounded-t bg-primary/30"
                      style={{ height: `${(v.views / dailyMax) * 100}%` }}
                    />
                    <div
                      title={`${v.adds} cart adds`}
                      className="w-1/3 rounded-t bg-primary/60"
                      style={{ height: `${(v.adds / dailyMax) * 100}%` }}
                    />
                    <div
                      title={`${v.enq} enquiries`}
                      className="w-1/3 rounded-t bg-primary"
                      style={{ height: `${(v.enq / dailyMax) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{day.slice(5)}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Light bar = page views · medium = cart adds · solid = enquiries
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <h2 className="border-b border-border p-4 text-lg font-semibold">
                Top products added to cart
              </h2>
              <Bars rows={topProducts.map(([label, value]) => ({ label, value }))} />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <h2 className="border-b border-border p-4 text-lg font-semibold">
                Enquiries by source
              </h2>
              <Bars
                rows={bySource.map(([label, value]) => ({
                  label,
                  value,
                  sub: `${value} · ${inr(revenueBySource.get(label) ?? 0)}`,
                }))}
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card lg:col-span-2">
              <h2 className="border-b border-border p-4 text-lg font-semibold">Most viewed pages</h2>
              <Bars rows={byPath.map(([label, value]) => ({ label, value }))} />
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
