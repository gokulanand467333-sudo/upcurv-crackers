import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { SOURCES } from "@/lib/admin";
import { inr } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/new-enquiry")({
  head: () => ({
    meta: [
      { title: "New Enquiry — Upcurv Crackers Seller Desk" },
      { name: "description", content: "Create a walk-in or phone enquiry manually." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "New Enquiry — Upcurv Crackers Seller Desk" },
      { property: "og:description", content: "Log an offline order into the pipeline." },
    ],
  }),
  component: NewEnquiry,
});

type Line = {
  product_id: string;
  product_code: string;
  product_name: string;
  qty: number;
  unit_price: number;
};

function NewEnquiry() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    city: "",
    address: "",
    pincode: "",
    source: "walk_in",
    fulfilment: "pickup",
    contact_method: "phone",
    message: "",
  });
  const [lines, setLines] = useState<Line[]>([]);
  const [q, setQ] = useState("");

  const products = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("code");
      if (error) throw error;
      return data;
    },
  });

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return (products.data ?? [])
      .filter(
        (p) => p.name.toLowerCase().includes(needle) || p.code.toLowerCase().includes(needle),
      )
      .slice(0, 8);
  }, [q, products.data]);

  const total = lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);

  const addLine = (p: { id: string; code: string; name: string; price: number }) => {
    setLines((prev) => {
      const hit = prev.find((l) => l.product_id === p.id);
      if (hit) return prev.map((l) => (l.product_id === p.id ? { ...l, qty: l.qty + 1 } : l));
      return [
        ...prev,
        {
          product_id: p.id,
          product_code: p.code,
          product_name: p.name,
          qty: 1,
          unit_price: Number(p.price),
        },
      ];
    });
    setQ("");
  };

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("enquiries")
        .insert({
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          city: form.city.trim(),
          address: form.address.trim() || null,
          pincode: form.pincode.trim() || null,
          source: form.source,
          fulfilment: form.fulfilment,
          contact_method: form.contact_method,
          message: form.message.trim() || null,
          status: "contacted",
          estimated_value: total,
          item_count: itemCount,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (lines.length) {
        const { error: itemErr } = await supabase.from("enquiry_items").insert(
          lines.map((l) => ({
            enquiry_id: data.id,
            product_id: l.product_id,
            product_code: l.product_code,
            product_name: l.product_name,
            qty: l.qty,
            unit_price: l.unit_price,
          })),
        );
        if (itemErr) throw itemErr;
      }
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Enquiry created");
      navigate({ to: "/enquiries/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell>
      <h1 className="text-xl font-semibold">New enquiry</h1>
      <p className="text-sm text-muted-foreground">
        Log a walk-in, phone or WhatsApp order manually into the pipeline.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-1">
          <h2 className="text-sm font-semibold">Customer</h2>
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label>Name*</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Mobile*</Label>
                <Input
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>City*</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Pincode</Label>
                <Input
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) => setForm({ ...form, source: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Fulfilment</Label>
                <Select
                  value={form.fulfilment}
                  onValueChange={(v) => setForm({ ...form, fulfilment: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contact via</Label>
                <Select
                  value={form.contact_method}
                  onValueChange={(v) => setForm({ ...form, contact_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Internal note</Label>
              <Textarea
                rows={3}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold">Items</h2>
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search product name or code to add"
              className="pl-8"
            />
            {results.length > 0 && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addLine(p)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span className="truncate">
                      {p.name} <span className="text-xs text-muted-foreground">{p.code}</span>
                    </span>
                    <span className="shrink-0 font-semibold">{inr(Number(p.price))}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 divide-y divide-border">
            {lines.map((l) => (
              <div key={l.product_id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.product_name}</p>
                  <p className="text-[11px] text-muted-foreground">{l.product_code}</p>
                </div>
                {/* Price is catalogue-controlled — edit it on the Products page only. */}
                <span className="w-24 text-right text-sm tabular-nums text-muted-foreground">
                  {inr(l.unit_price)}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-7"
                    onClick={() =>
                      setLines((prev) =>
                        prev
                          .map((x) =>
                            x.product_id === l.product_id ? { ...x, qty: x.qty - 1 } : x,
                          )
                          .filter((x) => x.qty > 0),
                      )
                    }
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-6 text-center text-sm tabular-nums">{l.qty}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-7"
                    onClick={() =>
                      setLines((prev) =>
                        prev.map((x) =>
                          x.product_id === l.product_id ? { ...x, qty: x.qty + 1 } : x,
                        ),
                      )
                    }
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
                <span className="w-24 text-right text-sm font-semibold">
                  {inr(l.qty * l.unit_price)}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setLines((prev) => prev.filter((x) => x.product_id !== l.product_id))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {lines.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No items yet — search above to add products.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div>
              <p className="text-xs text-muted-foreground">{itemCount} items</p>
              <p className="text-xl font-semibold">{inr(total)}</p>
            </div>
            <Button
              disabled={save.isPending}
              onClick={() => {
                if (!form.name.trim() || !form.mobile.trim() || !form.city.trim()) {
                  toast.error("Name, mobile and city are required.");
                  return;
                }
                save.mutate();
              }}
            >
              {save.isPending ? "Saving…" : "Create enquiry"}
            </Button>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
