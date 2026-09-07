import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, TablesInsert } from "@/integrations/supabase/types";
import { BOX_TAGS, categoriesQuery, type Product } from "@/lib/catalog";
import { inr } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Products — Upcurv Crackers Seller Desk" },
      { name: "description", content: "Add and edit catalogue products, prices and availability." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Products — Upcurv Crackers Seller Desk" },
      { property: "og:description", content: "Manage the shop catalogue." },
    ],
  }),
  component: ProductsAdmin,
});

const AVAILABILITY: Enums<"availability_status">[] = [
  "available",
  "limited",
  "unavailable",
  "enquiry_only",
];

type Draft = {
  id?: string;
  code: string;
  name: string;
  name_ta: string;
  category_id: string;
  pack: string;
  mrp: string;
  price: string;
  availability: Enums<"availability_status">;
  image_url: string;
  tags: string[];
  active: boolean;
  addon_rank: string;
  deal_rank: string;
  deal_price: string;
};

const emptyDraft = (): Draft => ({
  code: "",
  name: "",
  name_ta: "",
  category_id: "",
  pack: "",
  mrp: "",
  price: "",
  availability: "available",
  image_url: "",
  tags: [],
  active: true,
  addon_rank: "",
  deal_rank: "",
  deal_price: "",
});

const toDraft = (p: Product): Draft => ({
  id: p.id,
  code: p.code,
  name: p.name,
  name_ta: p.name_ta ?? "",
  category_id: p.category_id ?? "",
  pack: p.pack ?? "",
  mrp: p.mrp == null ? "" : String(p.mrp),
  price: String(p.price),
  availability: p.availability,
  image_url: p.image_url ?? "",
  tags: p.tags ?? [],
  active: p.active,
  addon_rank: p.addon_rank == null ? "" : String(p.addon_rank),
  deal_rank: p.deal_rank == null ? "" : String(p.deal_rank),
  deal_price: p.deal_price == null ? "" : String(p.deal_price),
});


function ProductsAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);

  const categories = useQuery(categoriesQuery);
  const products = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("code");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const payload: TablesInsert<"products"> = {
        code: d.code.trim().toUpperCase(),
        name: d.name.trim(),
        name_ta: d.name_ta.trim() || null,
        category_id: d.category_id || null,
        pack: d.pack.trim() || null,
        mrp: d.mrp === "" ? null : Number(d.mrp),
        price: Number(d.price || 0),
        availability: d.availability,
        image_url: d.image_url.trim() || null,
        tags: d.tags,
        active: d.active,
        addon_rank: d.addon_rank === "" ? null : Number(d.addon_rank),
        deal_rank: d.deal_rank === "" ? null : Number(d.deal_rank),
        deal_price: d.deal_price === "" ? null : Number(d.deal_price),

      };
      const res = d.id
        ? await supabase.from("products").update(payload).eq("id", d.id)
        : await supabase.from("products").insert(payload);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      toast.success("Product saved");
      setDraft(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("products").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      invalidate();
    },
    onError: () => toast.error("Product is used in an enquiry or combo — deactivate it instead."),
  });

  const catName = useMemo(
    () => Object.fromEntries((categories.data ?? []).map((c) => [c.id, c.name])),
    [categories.data],
  );

  const rows = (products.data ?? []).filter((p) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      p.name.toLowerCase().includes(needle) ||
      p.code.toLowerCase().includes(needle) ||
      (p.name_ta ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {products.data?.length ?? 0} items in the catalogue
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or code"
              className="w-56 pl-8"
            />
          </div>
          <Button onClick={() => setDraft(emptyDraft())}>
            <Plus className="size-4" /> Add product
          </Button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
        {products.isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3">
                <img
                  src={p.image_url || "/favicon.ico"}
                  alt={p.name}
                  className="h-11 w-14 shrink-0 rounded-md border border-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.code} · {catName[p.category_id ?? ""] ?? "No category"} · {p.pack ?? "—"}
                  </p>
                </div>
                <span className="w-20 text-right text-sm font-semibold">{inr(p.price)}</span>
                <span className="hidden w-28 text-xs text-muted-foreground sm:block">
                  {p.availability.replace("_", " ")}
                </span>
                <Switch
                  checked={p.active}
                  onCheckedChange={(v) => toggleActive.mutate({ id: p.id, active: v })}
                />
                <Button size="icon" variant="ghost" onClick={() => setDraft(toDraft(p))}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => remove.mutate(p.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">No products found.</p>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit product" : "Add product"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Code*</Label>
                <Input
                  value={draft.code}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Pack</Label>
                <Input
                  value={draft.pack}
                  placeholder="1 box (10 pcs)"
                  onChange={(e) => setDraft({ ...draft, pack: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Name*</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Tamil name</Label>
                <Input
                  value={draft.name_ta}
                  onChange={(e) => setDraft({ ...draft, name_ta: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Price*</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>MRP</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.mrp}
                  onChange={(e) => setDraft({ ...draft, mrp: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={draft.category_id}
                  onValueChange={(v) => setDraft({ ...draft, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Availability</Label>
                <Select
                  value={draft.availability}
                  onValueChange={(v) =>
                    setDraft({ ...draft, availability: v as Enums<"availability_status"> })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABILITY.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Image URL</Label>
                <Input
                  value={draft.image_url}
                  placeholder="https://…"
                  onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
                />
              </div>
              <div className="rounded-xl border border-border p-3 sm:col-span-2">
                <p className="text-sm font-semibold">Enquiry page placement</p>
                <p className="text-xs text-muted-foreground">
                  Leave a position blank to hide the product from that strip. Lower number appears
                  first.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Add-on position</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="—"
                      value={draft.addon_rank}
                      onChange={(e) => setDraft({ ...draft, addon_rank: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Deal position</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="—"
                      value={draft.deal_rank}
                      onChange={(e) => setDraft({ ...draft, deal_rank: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Deal price</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="—"
                      value={draft.deal_price}
                      onChange={(e) => setDraft({ ...draft, deal_price: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {BOX_TAGS.map((tg) => {
                    const on = draft.tags.includes(tg.key);
                    return (
                      <button
                        key={tg.key}
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            tags: on
                              ? draft.tags.filter((t) => t !== tg.key)
                              : [...draft.tags, tg.key],
                          })
                        }
                        className={`rounded-full border px-3 py-1 text-xs ${
                          on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        }`}
                      >
                        {tg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Switch
                  checked={draft.active}
                  onCheckedChange={(v) => setDraft({ ...draft, active: v })}
                />
                Visible in the public catalogue
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              disabled={save.isPending}
              onClick={() => {
                if (!draft) return;
                if (!draft.code.trim() || !draft.name.trim() || draft.price === "") {
                  toast.error("Code, name and price are required.");
                  return;
                }
                save.mutate(draft);
              }}
            >
              {save.isPending ? "Saving…" : "Save product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
