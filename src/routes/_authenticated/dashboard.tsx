import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { PIPELINE, STATUS_LABEL, type Enquiry } from "@/lib/admin";
import { inr } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Seller Dashboard — Upcurv Crackers" },
      { name: "description", content: "Today's enquiry overview for the shop team." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Seller Dashboard — Upcurv Crackers" },
      { property: "og:description", content: "Enquiry overview and follow-ups." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "enquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Enquiry[];
    },
  });

  const rows = data ?? [];
  const countBy = (s: string) => rows.filter((r) => r.status === s).length;
  const value = rows.reduce((s, r) => s + Number(r.estimated_value), 0);
  const followUps = rows.filter((r) => r.follow_up_at);

  const cards = [
    { label: "New Enquiries", value: countBy("new") },
    { label: "Pending Calls", value: countBy("contact_required") },
    { label: "Confirmed", value: countBy("confirmed") },
    { label: "Follow-up", value: followUps.length },
    { label: "Not Converted", value: countBy("not_converted") },
    { label: "Estimated Enquiry Value", value: inr(value) },
  ];

  return (
    <AdminShell>
      <h1 className="text-2xl font-semibold">Today&apos;s overview</h1>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(isLoading ? Array.from({ length: 6 }) : cards).map((c, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            {isLoading ? (
              <>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-7 w-14" />
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{(c as (typeof cards)[0]).label}</p>
                <p className="mt-1 text-2xl font-semibold">{(c as (typeof cards)[0]).value}</p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold">Latest enquiries</h2>
          <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2 p-4">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              : rows.slice(0, 8).map((r) => (
                  <Link
                    key={r.id}
                    to="/enquiries/$id"
                    params={{ id: r.id }}
                    className="block p-4 hover:bg-accent/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{r.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.ref} · {r.city} · {r.item_count} items ·{" "}
                      {inr(Number(r.estimated_value))} · {r.source}
                    </p>
                  </Link>
                ))}
            {!isLoading && rows.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">No enquiries yet.</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Follow-ups</h2>
          <div className="mt-3 space-y-2">
            {followUps.length === 0 && (
              <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                No follow-ups scheduled.
              </p>
            )}
            {followUps.map((f) => (
              <Link
                key={f.id}
                to="/enquiries/$id"
                params={{ id: f.id }}
                className="block rounded-xl border border-border bg-card p-3 text-sm hover:bg-accent/40"
              >
                <span className="font-medium">
                  {new Date(f.follow_up_at!).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>{" "}
                — {f.name} · {f.mobile}
              </Link>
            ))}
          </div>

          <h2 className="mt-6 text-lg font-semibold">Pipeline</h2>
          <div className="mt-3 space-y-1 rounded-2xl border border-border bg-card p-4 text-sm">
            {PIPELINE.map((p) => (
              <div key={p.key} className="flex justify-between">
                <span className="text-muted-foreground">{p.label}</span>
                <span className="font-semibold">{countBy(p.key)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
