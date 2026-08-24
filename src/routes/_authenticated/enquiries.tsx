import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { PIPELINE, waLink, type Enquiry } from "@/lib/admin";
import { inr } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/enquiries")({
  head: () => ({
    meta: [
      { title: "Enquiry Pipeline — Upcurv Crackers" },
      { name: "description", content: "Kanban pipeline of customer enquiries for the shop team." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Enquiry Pipeline — Upcurv Crackers" },
      { property: "og:description", content: "Track every enquiry from new to completed." },
    ],
  }),
  component: Pipeline,
});

function Pipeline() {
  const [q, setQ] = useState("");
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

  const rows = (data ?? []).filter((r) =>
    q
      ? `${r.name} ${r.mobile} ${r.ref ?? ""} ${r.city}`.toLowerCase().includes(q.toLowerCase())
      : true,
  );

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Enquiry pipeline</h1>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, mobile or enquiry ID"
          className="ml-auto max-w-xs"
        />
      </div>

      <div className="-mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-4">
        {PIPELINE.map((col) => {
          const items = rows.filter((r) => r.status === col.key);
          return (
            <div key={col.key} className="w-72 shrink-0">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold">{col.label}</h2>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <p className="px-1 text-[11px] text-muted-foreground">{col.hint}</p>
              <div className="mt-2 space-y-2">
                {isLoading &&
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="space-y-2 rounded-xl border border-border bg-card p-3">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                {items.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border bg-card p-3">
                    <Link to="/enquiries/$id" params={{ id: r.id }} className="block">
                      <p className="text-sm font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.ref} · {r.city}
                      </p>
                      <p className="mt-1 text-xs">
                        {r.item_count} items · {inr(Number(r.estimated_value))}
                      </p>
                    </Link>
                    <div className="mt-2 flex gap-2 text-xs">
                      <a
                        href={`tel:${r.mobile}`}
                        className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1"
                      >
                        <Phone className="size-3" /> Call
                      </a>
                      <a
                        href={waLink(r.mobile, `Hi ${r.name}, regarding your enquiry ${r.ref}`)}
                        className="rounded-md bg-secondary px-2 py-1"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                ))}
                {!isLoading && items.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
