import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ScanLine, Sparkles } from "lucide-react";
import { Suspense } from "react";

import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { LegalNotice, SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { categoriesQuery, EXPERIENCES, productsQuery } from "@/lib/catalog";
import { useLang, pick } from "@/lib/i18n";
import { SHOP } from "@/lib/shop";
import heroImage from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Upcurv Crackers — Diwali 2026 Catalogue & Enquiry" },
      {
        name: "description",
        content:
          "Browse the Diwali 2026 crackers catalogue from Upcurv Crackers, Coimbatore. Build your enquiry and our team will confirm availability, pricing and fulfilment.",
      },
      { property: "og:title", content: "Upcurv Crackers — Diwali 2026 Catalogue" },
      {
        property: "og:description",
        content: "Browse, build your Diwali box and send an enquiry. No online payment.",
      },
    ],
  }),
  component: Home,
});


function FeaturedProducts() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const slugOf = (id: string | null) => categories.find((c) => c.id === id)?.slug ?? null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.slice(0, 8).map((p) => (
        <ProductCard key={p.id} product={p} categorySlug={slugOf(p.category_id)} />
      ))}
    </div>
  );
}

function Home() {
  const { lang, t } = useLang();

  return (
    <SiteShell showFooter>
      <section className="brand-gradient border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-2 md:items-center md:py-16">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">
              <Sparkles className="size-3.5 text-primary" /> {SHOP.season}
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] md:text-5xl">
              🎇 Diwali Crackers {new Date().getFullYear()}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              {pick(
                lang,
                "Browse the catalogue. Build your enquiry. We'll contact you to confirm availability and order details.",
                "அட்டவணையை பாருங்கள். விசாரணையை உருவாக்குங்கள். கிடைக்கும் தன்மையை உறுதி செய்ய நாங்கள் உங்களை தொடர்பு கொள்வோம்.",
              )}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild size="lg">
                <Link to="/catalogue">{t("browse")}</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/build-box" search={{}}>
                  {t("buildBox")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/combos">{t("combos")}</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link to="/enquiry">{t("sendEnquiry")}</Link>
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-border">
            <img
              src={heroImage}
              alt="Sparklers and diya lamps arranged for Diwali"
              width={1600}
              height={1104}
              className="h-56 w-full object-cover md:h-80"
            />
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 pb-8">
          <LegalNotice />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-10">
        <h2 className="text-2xl font-semibold">{t("shopByExperience")}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {EXPERIENCES.map((e) => (
            <Link
              key={e.key}
              to="/catalogue"
              search={{ experience: e.key }}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary/40 hover:bg-accent/50"
            >
              {e.emoji} {pick(lang, e.label, e.labelTa)}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-10">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold">{t("popular")}</h2>
          <Link to="/catalogue" className="text-sm font-medium text-primary">
            {t("viewAll")}
          </Link>
        </div>
        <div className="mt-4">
          <Suspense
            fallback={
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            }
          >
            <FeaturedProducts />
          </Suspense>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-4">
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-secondary/50 p-5 sm:flex-row sm:items-center">
          <ScanLine className="size-8 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">Scan to view our Diwali catalogue</p>
            <p className="text-muted-foreground">
              Ask at the counter for our QR code, or share this page on WhatsApp.
            </p>
          </div>
          <Button asChild variant="outline" className="sm:ml-auto">
            <a href={`https://wa.me/${SHOP.whatsapp}`}>Chat with our team</a>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
