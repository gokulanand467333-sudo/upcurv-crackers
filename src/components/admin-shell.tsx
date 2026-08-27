import { Link, useNavigate } from "@tanstack/react-router";
import { Gift, LayoutDashboard, ListChecks, LogOut, Package, Tags } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SHOP } from "@/lib/shop";

const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/enquiries", label: "Enquiries", icon: ListChecks },
  { to: "/products", label: "Products", icon: Package },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/manage-combos", label: "Combos", icon: Gift },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4">
          <span className="font-display text-sm font-semibold">{SHOP.name} · Seller desk</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
        <nav className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              <l.icon className="size-4" />
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
