import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BOX_TAGS, buildBox, categoryImage, productsQuery } from "@/lib/catalog";
import { useCart } from "@/lib/enquiry-cart";
import { inr } from "@/lib/shop";

const BUDGETS = [1000, 2000, 3000, 5000, 10000];

export const Route = createFileRoute("/build-box")({
  validateSearch: (search: Record<string, unknown>): { budget?: number } => {
    const out: { budget?: number } = {};
    const raw = Number(search["budget"]);
    if (Number.isFinite(raw) && raw > 0) out.budget = raw;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Build My Diwali Box — Upcurv Crackers" },
      {
        name: "description",
        content:
          "Pick a budget and the style you want; we'll assemble a suggested selection from our shop catalogue that you can send as an enquiry.",
      },
      { property: "og:title", content: "Build My Diwali Box — Upcurv Crackers" },
      {
        property: "og:description",
        content: "Budget-based Diwali selections configured by our shop.",
      },
    ],
  }),
  component: BuildBox,
});

function BuildBox() {
  const initial = Route.useSearch().budget;
  const [budget, setBudget] = useState<number>(initial ?? 2000);
  const [tags, setTags] = useState<string[]>(["family", "variety"]);
  const { data, isLoading } = useQuery(productsQuery);
  const { add } = useCart();
  const navigate = useNavigate();

  const result = useMemo(
    () => buildBox(data ?? [], budget, tags),
    [data, budget, tags],
  );

  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <h1 className="text-3xl font-semibold">Build My Diwali Box</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A suggested selection from our shop&apos;s configured catalogue. Nothing is reserved until
          our team confirms.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">My budget</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {BUDGETS.map((b) => (
              <button
                key={b}
                onClick={() => setBudget(b)}
                className={`rounded-full border px-4 py-1.5 text-sm ${budget === b ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
              >
                {inr(b)}
                {b === 10000 ? "+" : ""}
              </button>
            ))}
          </div>

          <p className="mt-5 text-sm font-semibold">What type?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {BOX_TAGS.map((tg) => {
              const on = tags.includes(tg.key);
              return (
                <button
                  key={tg.key}
                  onClick={() =>
                    setTags((prev) =>
                      on ? prev.filter((x) => x !== tg.key) : [...prev, tg.key],
                    )
                  }
                  className={`rounded-full border px-4 py-1.5 text-sm ${on ? "border-primary bg-accent" : "border-border text-muted-foreground"}`}
                >
                  {on ? "☑" : "☐"} {tg.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Suggested selection</h2>
            <span className="text-sm text-muted-foreground">
              {result.picked.length} items · {inr(result.spent)}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border p-3">
                    <div className="shimmer size-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))
              : result.picked.map(({ product, qty }) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <img
                      src={product.image_url || categoryImage(null)}
                      alt={product.name}
                      loading="lazy"
                      width={96}
                      height={96}
                      className="size-12 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.code} · {product.pack}
                      </p>
                    </div>
                    <span className="text-sm">× {qty}</span>
                    <span className="w-16 text-right text-sm font-semibold">
                      {inr(Number(product.price) * qty)}
                    </span>
                  </div>
                ))}
          </div>

          {!isLoading && result.picked.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No matching items for this budget. Try a higher budget or fewer filters.
            </p>
          )}

          <Button
            size="lg"
            className="mt-5 w-full"
            disabled={!result.picked.length}
            onClick={() => {
              result.picked.forEach(({ product, qty }) =>
                add(
                  {
                    productId: product.id,
                    code: product.code,
                    name: product.name,
                    nameTa: product.name_ta,
                    price: Number(product.price),
                    categorySlug: null,
                  },
                  qty,
                ),
              );
              toast.success("Selection added to your enquiry");
              navigate({ to: "/enquiry" });
            }}
          >
            Add Entire Selection to Enquiry
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}
