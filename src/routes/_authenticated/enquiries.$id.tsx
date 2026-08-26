import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileCheck2, MessageCircle, Phone, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { PIPELINE, STATUS_LABEL, waLink, type EnquiryStatus } from "@/lib/admin";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { downloadSummaryPdf } from "@/lib/enquiry-pdf";
import { inr } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/enquiries/$id")({
  head: () => ({
    meta: [
      { title: "Enquiry Detail — Upcurv Crackers" },
      { name: "description", content: "Call mode view for a single customer enquiry." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Enquiry Detail — Upcurv Crackers" },
      { property: "og:description", content: "Seller actions, items and internal notes." },
    ],
  }),
  component: EnquiryDetail,
});

function EnquiryDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");

  const enquiry = useQuery({
    queryKey: ["admin", "enquiry", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquiries")
        .select("*, enquiry_items(*), enquiry_notes(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const update = useMutation({
    mutationFn: async (patch: TablesUpdate<"enquiries">) => {
      const { error } = await supabase.from("enquiries").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const addNote = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase
        .from("enquiry_notes")
        .insert({ enquiry_id: id, note: text });
      if (error) throw error;
    },
    onSuccess: () => {
      setNote("");
      invalidate();
    },
  });

  const itemMutation = useMutation({
    mutationFn: async ({
      itemId,
      patch,
    }: {
      itemId: string;
      patch: TablesUpdate<"enquiry_items">;
    }) => {
      const { error } = await supabase.from("enquiry_items").update(patch).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  if (enquiry.isLoading || !enquiry.data) {
    return (
      <AdminShell>
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <div className="shimmer h-40 w-full rounded-2xl" />
          <div className="shimmer h-64 w-full rounded-2xl" />
        </div>
      </AdminShell>
    );
  }

  const e = enquiry.data;
  const items = e.enquiry_items.filter((i) => !i.removed);
  const quotedValue = items.reduce((s, i) => s + i.qty * Number(i.unit_price), 0);
  const quote = `Quotation for enquiry ${e.ref}\n${items
    .map((i) => `${i.product_name} x${i.qty} — ${inr(i.qty * Number(i.unit_price))}`)
    .join("\n")}\nTotal (indicative): ${inr(quotedValue)}\nSubject to final confirmation.`;

  return (
    <AdminShell>
      <Link to="/enquiries" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Back to pipeline
      </Link>

      <div className="mt-3 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold">{e.name}</h1>
                <p className="text-sm text-muted-foreground">
                  📞 {e.mobile} · {e.city}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {e.ref} · source: {e.source} · {new Date(e.created_at).toLocaleString("en-IN")}
                </p>
              </div>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                {STATUS_LABEL[e.status]}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="lg">
                <a href={`tel:${e.mobile}`}>
                  <Phone className="size-4" /> Call Customer
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href={waLink(e.mobile, `Hi ${e.name}, regarding your enquiry ${e.ref}.`)}>
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={waLink(e.mobile, quote)}>Send Quotation</a>
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {PIPELINE.map((p) => (
                <button
                  key={p.key}
                  onClick={() => update.mutate({ status: p.key as EnquiryStatus })}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    e.status === p.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Follow up at</label>
                <Input
                  type="datetime-local"
                  value={followUp}
                  onChange={(ev) => setFollowUp(ev.target.value)}
                  className="mt-1 w-56"
                />
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  update.mutate({
                    follow_up_at: followUp ? new Date(followUp).toISOString() : null,
                  })
                }
              >
                Save follow-up
              </Button>
              {e.follow_up_at && (
                <span className="text-xs text-muted-foreground">
                  Scheduled: {new Date(e.follow_up_at).toLocaleString("en-IN")}
                </span>
              )}
            </div>

            {(e.message || e.free_text) && (
              <div className="mt-4 rounded-xl bg-secondary/60 p-3 text-sm">
                {e.message && <p>💬 {e.message}</p>}
                {e.free_text && <p className="mt-1">📝 {e.free_text}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  Preferred: {e.fulfilment} · {e.contact_method}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Requested products</h2>
              <span className="text-sm text-muted-foreground">
                {items.length} lines · {inr(quotedValue)} indicative
              </span>
            </div>
            <div className="mt-3 divide-y divide-border">
              {e.enquiry_items.map((i) => (
                <div
                  key={i.id}
                  className={`flex items-center gap-3 py-2 ${i.removed ? "opacity-40" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.product_name}</p>
                    <p className="text-xs text-muted-foreground">{i.product_code}</p>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={i.qty}
                    className="w-16"
                    onChange={(ev) =>
                      itemMutation.mutate({
                        itemId: i.id,
                        patch: { qty: Math.max(1, Number(ev.target.value)) },
                      })
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    value={Number(i.unit_price)}
                    className="w-24"
                    onChange={(ev) =>
                      itemMutation.mutate({
                        itemId: i.id,
                        patch: { unit_price: Number(ev.target.value) },
                      })
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      itemMutation.mutate({ itemId: i.id, patch: { removed: !i.removed } })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {e.enquiry_items.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">
                  Free-text enquiry — no catalogue items selected.
                </p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  update.mutate({
                    estimated_value: quotedValue,
                    item_count: items.reduce((s, i) => s + i.qty, 0),
                  })
                }
              >
                Save revised totals
              </Button>
              <Button
                onClick={() => {
                  update.mutate(
                    {
                      status: "confirmed",
                      estimated_value: quotedValue,
                      item_count: items.reduce((s, i) => s + i.qty, 0),
                    },
                    {
                      onSuccess: () => {
                        addNote.mutate(
                          `Converted to order on ${new Date().toLocaleString("en-IN")} · ${items.length} lines · ${inr(quotedValue)}`,
                        );
                        try {
                          downloadSummaryPdf({
                            title: "Order Confirmation",
                            ref: e.ref ?? "",
                            customer: { name: e.name, mobile: e.mobile, city: e.city },
                            items: items.map((i) => ({
                              name: i.product_name,
                              code: i.product_code,
                              qty: i.qty,
                              price: Number(i.unit_price),
                            })),
                            note: "Order confirmed offline with the customer. Fulfilment as agreed with the seller.",
                            fileName: `Order-${e.ref}.pdf`,
                          });
                        } catch {
                          toast.error("Order saved, but the PDF could not be generated.");
                        }
                        toast.success("Enquiry converted to order.");
                      },
                    },
                  );
                }}
              >
                <FileCheck2 className="size-4" /> Convert to Order
              </Button>
              <Button asChild variant="secondary">
                <a
                  href={waLink(
                    e.mobile,
                    `Hi ${e.name}, your order ${e.ref} is confirmed.\n${items
                      .map((i) => `${i.product_name} x${i.qty} — ${inr(i.qty * Number(i.unit_price))}`)
                      .join("\n")}\nTotal: ${inr(quotedValue)}\nWe will contact you for pickup/handover.`,
                  )}
                >
                  Send order confirmation
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Internal notes</h2>
            <Textarea
              rows={3}
              value={note}
              placeholder="Customer wants family combo. Call after 6 PM."
              className="mt-2"
              onChange={(ev) => setNote(ev.target.value)}
            />
            <Button
              className="mt-2 w-full"
              disabled={!note.trim()}
              onClick={() => addNote.mutate(note.trim())}
            >
              Add note
            </Button>
            <div className="mt-4 space-y-2">
              {[...e.enquiry_notes]
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .map((n) => (
                  <div key={n.id} className="rounded-xl bg-secondary/60 p-3 text-sm">
                    {n.note}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
