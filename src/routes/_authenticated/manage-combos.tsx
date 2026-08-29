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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { inr } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/manage-combos")({
  head: () => ({
    meta: [
      { title: "Combos — Upcurv Crackers Seller Desk" },
      { name: "description", content: "Create and edit combo gift boxes and their items." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Combos — Upcurv Crackers Seller Desk" },
      { property: "og:description", content: "Manage combo pricing, images and product lists." },
    ],
  }),
  component: CombosAdmin,
});

type Combo = Tables<"combos">;
type Draft = Partial<Combo> & { title: string; slug: string };

const EMPTY: Draft = {
  title: "",
  slug: "",
  title_ta: "",
  description: "",
  indicative_price: 0,
  image_url: "",
  active: true,
};

function CombosAdmin() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [itemsFor, setItemsFor] = useState<Combo | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "combos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("combos").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "combos"] });
    qc.invalidateQueries({ queryKey: ["combos"] });
  };

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const payload: TablesInsert<"combos"> = {
        slug: d.slug.trim(),
        title: d.title.trim(),
        title_ta: d.title_ta || null,
        description: d.description || null,
        indicative_price: Number(d.indicative_price ?? 0),
        image_url: d.image_url || null,
        active: d.active ?? true,
      };
      const { error } = d.id
        ? await supabase.from("combos").update(payload).eq("id", d.id)
        : await supabase.from("combos").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft(null);
      invalidate();
      toast.success("Combo saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("combos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Combos</h1>
        <Button className="ml-auto" onClick={() => setDraft({ ...EMPTY })}>
          <Plus className="size-4" /> New combo
        </Button>
      </div>

      <div className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer h-16 w-full" />)}
        {(data ?? []).map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-3">
            <button className="min-w-0 flex-1 text-left" onClick={() => setDraft(c)}>
              <p className="truncate text-sm font-semibold">{c.title}</p>
              <p className="text-xs text-muted-foreground">
                {c.slug} · {inr(Number(c.indicative_price))} · {c.active ? "active" : "hidden"}
              </p>
            </button>
            <Button variant="secondary" size="sm" onClick={() => setItemsFor(c)}>
              Items
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm(`Delete ${c.title}?`)) remove.mutate(c.id);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit combo" : "New combo"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(draft);
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Title*</Label>
                  <Input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tamil title</Label>
                  <Input
                    value={draft.title_ta ?? ""}
                    onChange={(e) => setDraft({ ...draft, title_ta: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug*</Label>
                  <Input
                    value={draft.slug}
                    onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Indicative price</Label>
                  <Input
                    type="number"
                    value={draft.indicative_price ?? 0}
                    onChange={(e) =>
                      setDraft({ ...draft, indicative_price: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={draft.description ?? ""}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Image URL</Label>
                <Input
                  value={draft.image_url ?? ""}
                  onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.active ?? true}
                  onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                />
                Active on storefront
              </label>
              <Button type="submit" className="w-full" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save combo"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!itemsFor} onOpenChange={(o) => !o && setItemsFor(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>{itemsFor?.title} · items</DialogTitle>
          </DialogHeader>
          {itemsFor && <ComboItems comboId={itemsFor.id} />}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function ComboItems({ comboId }: { comboId: string }) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);

  const products = useQuery({
    queryKey: ["admin", "products", "min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const items = useQuery({
    queryKey: ["admin", "combo-items", comboId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("combo_items")
        .select("id,qty,product_id,products(name)")
        .eq("combo_id", comboId);
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "combo-items", comboId] });
    qc.invalidateQueries({ queryKey: ["combos"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("Pick a product");
      const { error } = await supabase
        .from("combo_items")
        .insert({ combo_id: comboId, product_id: productId, qty });
      if (error) throw error;
    },
    onSuccess: () => {
      setProductId("");
      setQty(1);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("combo_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="divide-y divide-border rounded-xl border border-border">
        {items.isLoading && <div className="shimmer h-12 w-full" />}
        {(items.data ?? []).map((it) => (
          <div key={it.id} className="flex items-center gap-2 p-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{it.products?.name ?? it.product_id}</span>
            <span className="text-muted-foreground">×{it.qty}</span>
            <Button variant="ghost" size="icon" onClick={() => del.mutate(it.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {!items.isLoading && (items.data ?? []).length === 0 && (
          <p className="p-3 text-center text-xs text-muted-foreground">No items yet</p>
        )}
      </div>

      <div className="flex gap-2">
        <select
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          <option value="">Select product…</option>
          {(products.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Input
          type="number"
          min={1}
          className="w-20"
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
        />
        <Button onClick={() => add.mutate()} disabled={add.isPending}>
          Add
        </Button>
      </div>
    </div>
  );
}
