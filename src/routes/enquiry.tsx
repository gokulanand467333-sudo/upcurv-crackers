import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Download, MessageCircle, Minus, Plus, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { LegalNotice, SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categoryImage, couponDiscount, couponsQuery } from "@/lib/catalog";
import { readSource, useCart } from "@/lib/enquiry-cart";
import { submitEnquiry } from "@/lib/enquiry.functions";
import { downloadSummaryPdf } from "@/lib/enquiry-pdf";
import { pick, useLang } from "@/lib/i18n";
import { inr, SHOP } from "@/lib/shop";

export const Route = createFileRoute("/enquiry")({
  head: () => ({
    meta: [
      { title: "My Diwali Enquiry — Upcurv Crackers" },
      {
        name: "description",
        content:
          "Review your selected crackers, see savings on every item and send an enquiry. Our team confirms availability, pricing and fulfilment by phone or WhatsApp.",
      },
      { property: "og:title", content: "My Diwali Enquiry — Upcurv Crackers" },
      {
        property: "og:description",
        content: "Send your crackers enquiry — no login and no online payment.",
      },
    ],
  }),
  component: EnquiryPage,
});

type Done = {
  ref: string;
  estimated: number;
  itemCount: number;
  name: string;
  city: string;
  mobile: string;
  lines: { name: string; code: string | null; qty: number; price: number }[];
};

function enquiryPdf(done: Done) {
  downloadSummaryPdf({
    title: "Enquiry Summary",
    ref: done.ref,
    customer: { name: done.name, mobile: done.mobile, city: done.city },
    items: done.lines,
    note: "Our team will contact you to confirm availability, pricing and fulfilment options.",
    fileName: `Enquiry-${done.ref}.pdf`,
  });
}

function EnquiryPage() {
  const { items, setQty, remove, total, count, clear, ready } = useCart();
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const submit = useServerFn(submitEnquiry);
  const [done, setDone] = useState<Done | null>(null);
  const [open, setOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const coupons = useQuery(couponsQuery);

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    city: "",
    address: "",
    pincode: "",
    message: "",
  });

  const mrpTotal = items.reduce((s, i) => s + i.qty * (i.mrp && i.mrp > i.price ? i.mrp : i.price), 0);
  const saved = Math.max(0, mrpTotal - total);

  const appliedCoupon = (coupons.data ?? []).find((c) => c.code === couponCode) ?? null;
  const couponOff = appliedCoupon ? couponDiscount(appliedCoupon, total).discount : 0;
  const payable = Math.max(0, total - couponOff);

  const applyCoupon = (raw: string) => {
    const code = raw.trim().toUpperCase();
    const found = (coupons.data ?? []).find((c) => c.code === code);
    if (!found) {
      toast.error("Invalid coupon code");
      return;
    }
    const res = couponDiscount(found, total);
    if (!res.ok) {
      toast.error(res.reason);
      return;
    }
    setCouponCode(found.code);
    toast.success(`Coupon applied — you save ${inr(res.discount)}`);
  };

  const mutation = useMutation({
    mutationFn: async () =>
      submit({
        data: {
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          city: form.city.trim(),
          address: form.address.trim() || null,
          pincode: form.pincode.trim() || null,
          fulfilment: "contact",
          contactMethod: "call",
          message: form.message.trim() || null,
          freeText: null,
          source: readSource(),
          items: items.map((i) => ({
            productId: i.kind === "combo" ? null : i.productId,
            code: i.code,
            name: i.name,
            qty: i.qty,
            price: i.price,
          })),
          couponCode,
        },
      }),
    onSuccess: (res) => {
      const record: Done = {
        ...res,
        name: form.name.trim(),
        city: form.city.trim(),
        mobile: form.mobile.trim(),
        lines: items.map((i) => ({ name: i.name, code: i.code, qty: i.qty, price: i.price })),
      };
      setOpen(false);
      setDone(record);
      clear();
      try {
        enquiryPdf(record);
      } catch {
        toast.error("Enquiry sent, but the PDF could not be generated.");
      }
    },
    onError: () => toast.error("Could not send your enquiry. Please try again."),
  });

  if (done) {
    const message = encodeURIComponent(
      `Hi, I submitted enquiry ${done.ref}.\nName: ${done.name}\nArea: ${done.city}\nProducts: ${done.itemCount} items\nEstimated catalogue value: ${inr(done.estimated)}`,
    );
    const steps = [
      "Our team reviews your enquiry",
      "We contact you",
      "Availability and pricing are confirmed",
      "Order/fulfilment is arranged according to applicable requirements",
    ];
    return (
      <SiteShell>
        <div className="mx-auto w-full max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <CheckCircle2 className="mx-auto size-10 text-primary" />
            <h1 className="mt-3 text-2xl font-semibold">🎆 Enquiry Received!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enquiry ID
              <span className="ml-1 rounded-md bg-accent px-2 py-0.5 font-mono text-sm font-semibold text-accent-foreground">
                {done.ref}
              </span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              We&apos;ve received your selected products.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-border p-5">
            <h2 className="text-lg font-semibold">What happens next?</h2>
            <ol className="mt-3 space-y-3">
              {steps.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-secondary/50 p-5">
            <p className="text-sm font-semibold">Prefer WhatsApp?</p>
            <Button asChild className="mt-3 w-full">
              <a href={`https://wa.me/${SHOP.whatsapp}?text=${message}`}>
                <MessageCircle className="size-4" /> Chat with our team
              </a>
            </Button>
            <Button variant="secondary" className="mt-2 w-full" onClick={() => enquiryPdf(done)}>
              <Download className="size-4" /> Download enquiry PDF
            </Button>
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link to="/track" search={{ ref: done.ref }}>
                Track this enquiry
              </Link>
            </Button>
          </div>

          <div className="mt-6">
            <LegalNotice />
          </div>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-32">
        <h1 className="text-3xl font-semibold">{t("myEnquiry")}</h1>

        {ready && items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">{t("emptyCart")}</p>
            <Button className="mt-4" onClick={() => navigate({ to: "/catalogue", search: {} })}>
              {t("browse")}
            </Button>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {items.map((i) => {
              const hasMrp = i.mrp != null && i.mrp > i.price;
              const lineSaved = hasMrp ? (i.mrp! - i.price) * i.qty : 0;
              return (
                <div key={i.productId} className="flex items-start gap-3 p-3">
                  <img
                    src={i.imageUrl || categoryImage(i.categorySlug)}
                    alt={i.name}
                    loading="lazy"
                    width={64}
                    height={48}
                    className="h-12 w-16 shrink-0 rounded-md border border-border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{pick(lang, i.name, i.nameTa)}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.kind === "combo"
                        ? `Gift box · ${i.comboItemCount ?? 0} items inside`
                        : i.code}
                    </p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold">{inr(i.price * i.qty)}</span>
                      {hasMrp && (
                        <>
                          <span className="text-xs text-muted-foreground line-through">
                            {inr(i.mrp! * i.qty)}
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-600">
                            Save {inr(lineSaved)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setQty(i.productId, i.qty - 1)}
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">{i.qty}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setQty(i.productId, i.qty + 1)}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1 text-xs text-muted-foreground"
                      onClick={() => remove(i.productId)}
                    >
                      <Trash2 className="size-3.5" /> Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {items.length > 0 && (
          <>
            <div className="mt-4 rounded-2xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Tag className="size-4 text-primary" /> Coupons
              </h2>
              {appliedCoupon ? (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-emerald-700">{appliedCoupon.code}</p>
                    <p className="text-xs text-emerald-700/80">
                      {appliedCoupon.label ?? "Coupon applied"} · saves {inr(couponOff)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCouponCode(null);
                      setCouponInput("");
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="h-11 flex-1 uppercase"
                    />
                    <Button className="h-11" onClick={() => applyCoupon(couponInput)}>
                      Apply
                    </Button>
                  </div>
                  {(coupons.data ?? []).length > 0 && (
                    <div className="mt-3 space-y-2">
                      {(coupons.data ?? []).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => applyCoupon(c.code)}
                          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2 text-left"
                        >
                          <span className="rounded-md bg-accent px-2 py-0.5 font-mono text-xs font-semibold">
                            {c.code}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                            {c.label ?? "Offer"}
                          </span>
                          <span className="text-xs font-semibold text-primary">Apply</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold">Bill details</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Catalogue value ({count} items)</span>
                  <span className="font-medium">{inr(mrpTotal)}</span>
                </div>
                {saved > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium text-emerald-600">− {inr(saved)}</span>
                  </div>
                )}
                {couponOff > 0 && appliedCoupon && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Coupon ({appliedCoupon.code})</span>
                    <span className="font-medium text-emerald-600">− {inr(couponOff)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Delivery / pickup</span>
                  <span className="font-medium">Confirmed by seller</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-base font-semibold">{t("estimated")}</span>
                <div className="text-right">
                  {saved > 0 && (
                    <span className="mr-2 text-sm text-muted-foreground line-through">
                      {inr(mrpTotal)}
                    </span>
                  )}
                  <span className="text-xl font-bold">{inr(payable)}</span>
                </div>
              </div>
              {saved > 0 && (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  🎉 You save {inr(saved + couponOff)} on this enquiry
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Final availability, pricing and fulfilment will be confirmed by our team.
              </p>
            </div>

            <div className="mt-5">
              <LegalNotice compact />
            </div>

            <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background/95 p-3 backdrop-blur md:bottom-0">
              <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{count} items</p>
                  <p className="text-lg font-bold leading-none">{inr(payable)}</p>
                </div>
                <Button size="lg" className="ml-auto flex-1" onClick={() => setOpen(true)}>
                  {t("sendEnquiry")}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-3xl p-5 sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle>Your details</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !form.name.trim() ||
                form.mobile.trim().length < 8 ||
                !form.city.trim() ||
                !form.address.trim() ||
                form.pincode.trim().length < 4
              ) {
                toast.error("Please fill name, mobile, city, address and pincode.");
                return;
              }
              mutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="name">Name*</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobile number*</Label>
              <Input
                id="mobile"
                inputMode="tel"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="city">City / Area*</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pincode">Pincode*</Label>
                <Input
                  id="pincode"
                  inputMode="numeric"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address*</Label>
              <Textarea
                id="address"
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">Optional note</Label>
              <Textarea
                id="message"
                rows={2}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Sending…" : t("sendEnquiry")}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Enquiry only · no online payment
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </SiteShell>
  );
}
