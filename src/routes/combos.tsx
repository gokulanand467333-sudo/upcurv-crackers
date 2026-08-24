import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryImage, combosQuery } from "@/lib/catalog";
import { useCart } from "@/lib/enquiry-cart";
import { pick, useLang } from "@/lib/i18n";
import { inr } from "@/lib/shop";

export const Route = createFileRoute("/combos")({
  head: () => ({
    meta: [
      { title: "Diwali Combos & Gift Boxes — Upcurv Crackers" },
      {
        name: "description",
        content:
          "Seller-configured Diwali combos: family combo, kids joy combo and premium collection. Add a full combo to your enquiry.",
      },
      { property: "og:title", content: "Diwali Combos & Gift Boxes — Upcurv Crackers" },
      {
        property: "og:description",
        content: "Ready-made combos put together by our shop. Indicative pricing only.",
      },
    ],
  }),
  component: Combos,
});

function Combos() {
  const { data, isLoading } = useQuery(combosQuery);
  const { add } = useCart();
  const { lang } = useLang();
  const navigate = useNavigate();

  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="text-3xl font-semibold">Combos & Gift Boxes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Collections put together by our shop. Prices are indicative and confirmed on contact.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border p-4">
                  <div className="shimmer h-32 w-full rounded-xl" />
                  <Skeleton className="mt-4 h-5 w-2/3" />
                  <Skeleton className="mt-2 h-4 w-full" />
                  <Skeleton className="mt-4 h-9 w-full rounded-lg" />
                </div>
              ))
            : (data ?? []).map((combo) => (
                <div
                  key={combo.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <img
                    src={combo.image_url || categoryImage("gift-boxes")}
                    alt={combo.title}
                    loading="lazy"
                    width={900}
                    height={900}
                    className="h-36 w-full object-cover"
                  />
                  <div className="flex flex-1 flex-col p-4">
                    <h2 className="text-lg font-semibold">
                      🎇 {pick(lang, combo.title, combo.title_ta)}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">{combo.description}</p>
                    <p className="mt-2 text-sm font-semibold">
                      {inr(combo.indicative_price)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">indicative</span>
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {combo.combo_items.map((ci, idx) => (
                        <li key={idx}>
                          • {ci.products?.name} × {ci.qty}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-4"
                      onClick={() => {
                        combo.combo_items.forEach((ci) => {
                          if (!ci.products) return;
                          add(
                            {
                              productId: ci.products.id,
                              code: ci.products.code,
                              name: ci.products.name,
                              nameTa: ci.products.name_ta,
                              price: Number(ci.products.price),
                              categorySlug: null,
                            },
                            ci.qty,
                          );
                        });
                        toast.success(`${combo.title} added to your enquiry`);
                        navigate({ to: "/enquiry" });
                      }}
                    >
                      Add Combo to Enquiry
                    </Button>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </SiteShell>
  );
}
