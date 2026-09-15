import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  FileCheck2,
  MessageCircle,
  Pencil,
  Phone,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/payments";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { PIPELINE, STATUS_LABEL, STATUS_TONE, waLink, type EnquiryStatus } from "@/lib/admin";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { downloadDeliverySlip } from "@/lib/delivery-slip";
import { downloadSummaryPdf } from "@/lib/enquiry-pdf";
import { inr } from "@/lib/shop";
import { cn } from "@/lib/utils";

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
  const [editing, setEditing] = useState(false);
  const [finalInput, setFinalInput] = useState("");
  const [pay, setPay] = useState({ amount: "", method: "upi", reference: "", note: "" });

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

  const payments = useQuery({
    queryKey: ["admin", "payments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("enquiry_id", id)
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });


  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  // Opening the enquiry marks it as seen, which clears the sidebar alert.
  const seenAt = enquiry.data?.seen_at ?? null;
  useEffect(() => {
    if (!enquiry.data || seenAt) return;
    void supabase
      .from("enquiries")
      .update({ seen_at: new Date().toISOString() })
      .eq("id", id)
      .then(() => qc.invalidateQueries({ queryKey: ["admin"] }));
  }, [enquiry.data, seenAt, id, qc]);

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

  /** Every edit is logged automatically in the internal notes trail. */
  const logEdit = (text: string) => {
    void supabase.from("enquiry_notes").insert({
      enquiry_id: id,
      note: `[edit] ${text}`,
    });
  };

  const addPayment = useMutation({
    mutationFn: async (row: {
      amount: number;
      method: string;
      reference: string | null;
      note: string | null;
    }) => {
      const { error } = await supabase.from("payments").insert({ enquiry_id: id, ...row });
      if (error) throw error;
      logEdit(`Payment recorded: ${inr(row.amount)} via ${row.method}`);
    },
    onSuccess: () => {
      setPay({ amount: "", method: "upi", reference: "", note: "" });
      toast.success("Payment recorded");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deletePayment = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", paymentId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err: Error) => toast.error(err.message),
  });

  const itemMutation = useMutation({
    mutationFn: async ({
      itemId,
      patch,
      log,
    }: {
      itemId: string;
      patch: TablesUpdate<"enquiry_items">;
      log?: string;
    }) => {
      const { error } = await supabase.from("enquiry_items").update(patch).eq("id", itemId);
      if (error) throw error;
      if (log) logEdit(log);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
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
  const billAmount = e.final_amount != null ? Number(e.final_amount) : quotedValue;
  const collected = (payments.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const balance = Math.max(0, billAmount - collected);
  const quote = `Quotation for enquiry ${e.ref}\n${items
    .map((i) => `${i.product_name} x${i.qty} — ${inr(i.qty * Number(i.unit_price))}`)
    .join("\n")}\nTotal (indicative): ${inr(quotedValue)}\nSubject to final confirmation.`;

  const setStatus = (status: EnquiryStatus) => {
    if (status === e.status) return;
    update.mutate({ status }, { onSuccess: () => logEdit(`Status changed to ${STATUS_LABEL[status]}`) });
  };

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
                  {e.state ? `, ${e.state}` : ""}
                </p>
                {(e.address || e.pincode) && (
                  <p className="text-sm text-muted-foreground">
                    {[e.address, e.pincode].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {e.ref} · source: {e.source} · {new Date(e.created_at).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold",
                    STATUS_TONE[e.status],
                  )}
                >
                  {STATUS_LABEL[e.status]}
                </span>
                <Button
                  size="sm"
                  variant={editing ? "secondary" : "outline"}
                  onClick={() => setEditing((v) => !v)}
                >
                  {editing ? (
                    <>
                      <X className="size-4" /> Done editing
                    </>
                  ) : (
                    <>
                      <Pencil className="size-4" /> Edit
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Money summary, always visible at the top of the enquiry. */}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-report-blue/5 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {e.final_amount != null ? "Final amount" : "Total amount"}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-report-blue">
                  {inr(billAmount)}
                </p>
                {e.final_amount != null && (
                  <p className="text-[11px] text-muted-foreground">
                    Quoted {inr(quotedValue)} · {items.length} items
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-border bg-report-green/5 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Collected
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-report-green">
                  {inr(collected)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {(payments.data ?? []).length} payment(s)
                </p>
              </div>
              <div className="rounded-xl border border-border bg-report-rose/5 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Balance due
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-report-rose">
                  {inr(balance)}
                </p>
              </div>
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
              {e.status === "ready" && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    try {
                      downloadDeliverySlip({
                        ref: e.ref ?? "",
                        customer: {
                          name: e.name,
                          mobile: e.mobile,
                          city: e.city,
                          state: e.state,
                          address: e.address,
                          pincode: e.pincode,
                        },
                        lines: items.map((i) => ({ name: i.product_name, qty: i.qty })),
                        total: quotedValue,
                        fileName: `Delivery-Slip-${e.ref}.pdf`,
                      });
                    } catch {
                      toast.error("Could not generate the delivery slip.");
                    }
                  }}
                >
                  <Printer className="size-4" /> Delivery slip
                </Button>
              )}
            </div>

            {editing ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {PIPELINE.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setStatus(p.key)}
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
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                View only — tap Edit to change the status, quantities or follow-up.
              </p>
            )}

            {editing ? (
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
                    update.mutate(
                      { follow_up_at: followUp ? new Date(followUp).toISOString() : null },
                      {
                        onSuccess: () =>
                          logEdit(
                            followUp
                              ? `Follow-up set to ${new Date(followUp).toLocaleString("en-IN")}`
                              : "Follow-up cleared",
                          ),
                      },
                    )
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
            ) : (
              e.follow_up_at && (
                <p className="mt-3 text-sm">
                  Follow-up scheduled:{" "}
                  <span className="font-medium">
                    {new Date(e.follow_up_at).toLocaleString("en-IN")}
                  </span>
                </p>
              )
            )}

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
                  {editing ? (
                    <Input
                      type="number"
                      min={1}
                      value={i.qty}
                      className="w-16"
                      onChange={(ev) => {
                        const qty = Math.max(1, Number(ev.target.value));
                        itemMutation.mutate({
                          itemId: i.id,
                          patch: { qty },
                          log: `${i.product_name}: quantity ${i.qty} → ${qty}`,
                        });
                      }}
                    />
                  ) : (
                    <span className="w-16 text-center text-sm tabular-nums">× {i.qty}</span>
                  )}
                  {/* Prices come from the catalogue — change them on the Products page. */}
                  <span className="w-24 text-right text-sm tabular-nums text-muted-foreground">
                    {inr(Number(i.unit_price))}
                  </span>
                  <span className="w-24 text-right text-sm font-semibold">
                    {inr(i.qty * Number(i.unit_price))}
                  </span>
                  {editing && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        itemMutation.mutate({
                          itemId: i.id,
                          patch: { removed: !i.removed },
                          log: `${i.product_name} ${i.removed ? "restored" : "removed"}`,
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
              {e.enquiry_items.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">
                  Free-text enquiry — no catalogue items selected.
                </p>
              )}
            </div>
            {editing && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    update.mutate(
                      {
                        estimated_value: quotedValue,
                        item_count: items.reduce((s, i) => s + i.qty, 0),
                      },
                      { onSuccess: () => logEdit(`Totals revised to ${inr(quotedValue)}`) },
                    )
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
                        .map(
                          (i) => `${i.product_name} x${i.qty} — ${inr(i.qty * Number(i.unit_price))}`,
                        )
                        .join("\n")}\nTotal: ${inr(quotedValue)}\nWe will contact you for pickup/handover.`,
                    )}
                  >
                    Send order confirmation
                  </a>
                </Button>
              </div>
            )}
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
