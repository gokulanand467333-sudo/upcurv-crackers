import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

import sparklers from "@/assets/cat-sparklers.jpg";
import ground from "@/assets/cat-ground.jpg";
import gift from "@/assets/cat-gift.jpg";

export type Product = Tables<"products">;
export type Category = Tables<"categories">;
export type Combo = Tables<"combos">;

export const categoryImage = (slug: string | null | undefined) => {
  switch (slug) {
    case "sparklers":
    case "flower-pots":
    case "kids":
      return sparklers;
    case "gift-boxes":
    case "fancy":
      return gift;
    default:
      return ground;
  }
};

export const AVAILABILITY_LABEL: Record<string, string> = {
  available: "Available",
  limited: "Limited",
  unavailable: "Unavailable",
  enquiry_only: "Ask availability",
};

export const EXPERIENCES = [
  { key: "sky", label: "Sky & Aerial", emoji: "🎆" },
  { key: "sparkle", label: "Sparkle & Light", emoji: "✨" },
  { key: "colourful", label: "Colourful", emoji: "🌈" },
  { key: "traditional", label: "Traditional", emoji: "🪔" },
  { key: "gift", label: "Gift Packs", emoji: "🎁" },
  { key: "family", label: "Family Collections", emoji: "👨‍👩‍👧" },
];

export const BOX_TAGS = [
  { key: "family", label: "Family" },
  { key: "kids", label: "Children friendly" },
  { key: "colourful", label: "Colourful" },
  { key: "variety", label: "Variety" },
  { key: "premium", label: "Premium" },
  { key: "traditional", label: "Traditional" },
];

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("*").order("sort");
    if (error) throw error;
    return data;
  },
});

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("code");
    if (error) throw error;
    return data;
  },
});

export const combosQuery = queryOptions({
  queryKey: ["combos"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("combos")
      .select("*, combo_items(qty, products(*))")
      .eq("active", true)
      .order("indicative_price");
    if (error) throw error;
    return data;
  },
});

/** Seller-configured budget selection: greedy fill from tagged products. */
export function buildBox(products: Product[], budget: number, tags: string[]) {
  const pool = products.filter(
    (p) =>
      p.availability !== "unavailable" &&
      (tags.length === 0 || tags.some((t) => p.tags.includes(t))),
  );
  const sorted = [...pool].sort((a, b) => Number(b.price) - Number(a.price));
  const picked: { product: Product; qty: number }[] = [];
  let spent = 0;
  // one of each affordable item first (variety), then top up the cheapest ones
  for (const p of sorted) {
    const price = Number(p.price);
    if (spent + price <= budget) {
      picked.push({ product: p, qty: 1 });
      spent += price;
    }
  }
  let guard = 0;
  while (guard++ < 200 && picked.length) {
    const cheapest = picked.reduce((a, b) =>
      Number(a.product.price) <= Number(b.product.price) ? a : b,
    );
    const price = Number(cheapest.product.price);
    if (price <= 0 || spent + price > budget) break;
    cheapest.qty += 1;
    spent += price;
  }
  return { picked, spent };
}

export type Coupon = Tables<"coupons">;

export const couponsQuery = queryOptions({
  queryKey: ["coupons"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("active", true)
      .order("created_at");
    if (error) throw error;
    return data;
  },
});

/** Shared coupon maths — used on the enquiry page and re-checked on the server. */
export function couponDiscount(coupon: Coupon, subtotal: number) {
  if (!coupon.active) return { ok: false as const, reason: "This coupon is no longer active.", discount: 0 };
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now())
    return { ok: false as const, reason: "This coupon has expired.", discount: 0 };
  if (subtotal < Number(coupon.min_value))
    return {
      ok: false as const,
      reason: `Add items worth ₹${Number(coupon.min_value) - subtotal} more to use this coupon.`,
      discount: 0,
    };
  let discount =
    coupon.discount_type === "flat"
      ? Number(coupon.value)
      : (subtotal * Number(coupon.value)) / 100;
  if (coupon.max_discount != null) discount = Math.min(discount, Number(coupon.max_discount));
  discount = Math.min(Math.round(discount), subtotal);
  return { ok: true as const, reason: "", discount };
}
