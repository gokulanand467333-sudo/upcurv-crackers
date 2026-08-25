import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, MessageCircle, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { LegalNotice, SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { categoryImage } from "@/lib/catalog";
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
          "Review your selected crackers and send an enquiry. Our team confirms availability, pricing and fulfilment by phone or WhatsApp.",
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

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    city: "",
    fulfilment: "contact",
    contactMethod: "call",
    message: "",
    freeText: "",
  });

  const mutation = useMutation({
    mutationFn: async () =>
      submit({
        data: {
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          city: form.city.trim(),
          fulfilment: form.fulfilment,
          contactMethod: form.contactMethod,
          message: form.message.trim() || null,
          freeText: form.freeText.trim() || null,
          source: readSource(),
          items: items.map((i) => ({
            productId: i.productId,
            code: i.code,
            name: i.name,
            qty: i.qty,
            price: i.price,
          })),
        },
      }),
    onSuccess: (res) => {
      setDone({ ...res, name: form.name.trim(), city: form.city.trim() });
      clear();
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
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
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
            {items.map((i) => (
              <div key={i.productId} className="flex items-center gap-3 p-3">
                <img
                  src={i.imageUrl || categoryImage(i.categorySlug)}
                  alt={i.name}
                  loading="lazy"
                  width={64}
                  height={48}
                  className="h-12 w-16 shrink-0 rounded-md border border-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{pick(lang, i.name, i.nameTa)}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.code} · {inr(i.price)}
                  </p>
                </div>
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
                <span className="w-20 text-right text-sm font-semibold">
                  {inr(i.price * i.qty)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground"
                  onClick={() => remove(i.productId)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center justify-between bg-secondary/40 p-4">
              <span className="text-sm font-medium">
                {t("estimated")} · {count} items
              </span>
              <span className="text-xl font-semibold">{inr(total)}</span>
            </div>
          </div>
        )}

        <p className="mt-3 text-xs font-medium text-muted-foreground">
          Final availability, pricing and fulfilment will be confirmed by our team.
        </p>

        <form
          className="mt-8 space-y-5 rounded-2xl border border-border p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim() || form.mobile.trim().length < 8 || !form.city.trim()) {
              toast.error("Please fill name, mobile number and city.");
              return;
            }
            mutation.mutate();
          }}
        >
          <div>
            <h2 className="text-lg font-semibold">Tell us about your requirement</h2>
            <p className="text-xs text-muted-foreground">No account needed.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="city">City / Area*</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>How would you like to proceed?</Label>
            <RadioGroup
              value={form.fulfilment}
              onValueChange={(v) => setForm({ ...form, fulfilment: v })}
              className="gap-2"
            >
              {SHOP.fulfilment.map((f) => (
                <label
                  key={f.value}
                  className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm"
                >
                  <RadioGroupItem value={f.value} /> {f.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Preferred contact method</Label>
            <RadioGroup
              value={form.contactMethod}
              onValueChange={(v) => setForm({ ...form, contactMethod: v })}
              className="flex gap-2"
            >
              {SHOP.contactMethods.map((c) => (
                <label
                  key={c.value}
                  className="flex flex-1 items-center gap-2 rounded-xl border border-border p-3 text-sm"
                >
                  <RadioGroupItem value={c.value} /> {c.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="message">Optional message</Label>
            <Textarea
              id="message"
              rows={2}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="freeText">Quick enquiry (type what you need)</Label>
            <Textarea
              id="freeText"
              rows={3}
              placeholder="Need 10 boxes sparklers, 5 flower pots and family combo around 3000."
              value={form.freeText}
              onChange={(e) => setForm({ ...form, freeText: e.target.value })}
            />
          </div>

          <LegalNotice compact />

          <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Sending…" : t("sendEnquiry")}
          </Button>
        </form>
      </div>
    </SiteShell>
  );
}
