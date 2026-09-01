import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/shop";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/coupons")({
  head: () => ({
    meta: [
      { title: "Coupons — Upcurv Crackers Seller Desk" },
      { name: "description", content: "Create and manage discount coupons for customer enquiries." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Coupons — Upcurv Crackers Seller Desk" },
      { property: "og:description", content: "Manage percentage and flat discount coupon codes." },
    ],
  }),
  component: CouponsPage,
});

type Coupon = Tables<"coupons">;
type Draft = Partial<Coupon> & { code: string };

const EMPTY: Draft = {
  code: "",
  label: "",
  discount_type: "percent",
  value: 10,
  min_value: 0,
  max_discount: null,
  active: true,
};

function CouponsPage() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const payload: TablesInsert<"coupons"> = {
        code: d.code.trim().toUpperCase(),
        label: d.label || null,
        discount_type: d.discount_type === "flat" ? "flat" : "percent",
        value: Number(d.value ?? 0),
        min_value: Number(d.min_value ?? 0),
        max_discount:
          d.max_discount === null || d.max_discount === undefined || d.max_discount === ("" as unknown)
            ? null
            : Number(d.max_discount),
        active: d.active ?? true,
      };
      const { error } = d.id
        ? await supabase.from("coupons").update(payload).eq("id", d.id)
        : await supabase.from("coupons").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
      qc.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
      qc.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Coupons</h1>
        <Button className="ml-auto" onClick={() => setDraft({ ...EMPTY })}>
          <Plus className="size-4" /> New coupon
        </Button>
      </div>

      <div className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer h-16 w-full" />)}
        {(data ?? []).map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-3">
            <button className="min-w-0 flex-1 text-left" onClick={() => setDraft(c)}>
              <p className="truncate text-sm font-semibold">
                {c.code}{" "}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {c.discount_type === "flat" ? inr(Number(c.value)) : `${Number(c.value)}%`} off
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {c.label ?? "—"} · min {inr(Number(c.min_value))} · used {c.used_count}
                {c.active ? "" : " · inactive"}
              </p>
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm(`Delete ${c.code}?`)) remove.mutate(c.id);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">No coupons yet.</p>
        )}
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit coupon" : "New coupon"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(draft);
              }}
            >
              <div className="space-y-1.5">
                <Label>Code*</Label>
                <Input
                  value={draft.code}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description shown to customers</Label>
                <Input
                  value={draft.label ?? ""}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={draft.discount_type ?? "percent"}
                    onChange={(e) => setDraft({ ...draft, discount_type: e.target.value })}
                  >
                    <option value="percent">Percentage</option>
                    <option value="flat">Flat amount</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Value*</Label>
                  <Input
                    type="number"
                    value={Number(draft.value ?? 0)}
                    onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Minimum bill</Label>
                  <Input
                    type="number"
                    value={Number(draft.min_value ?? 0)}
                    onChange={(e) => setDraft({ ...draft, min_value: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Max discount</Label>
                  <Input
                    type="number"
                    value={draft.max_discount == null ? "" : Number(draft.max_discount)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        max_discount: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Switch
                  checked={draft.active ?? true}
                  onCheckedChange={(v) => setDraft({ ...draft, active: v })}
                />
                <span className="text-sm">Active</span>
              </div>
              <Button type="submit" className="w-full" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save coupon"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
