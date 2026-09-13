import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Gift,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Package,
  Tags,
  TicketPercent,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { SHOP } from "@/lib/shop";

const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/enquiries", label: "Enquiries", icon: ListChecks },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/products", label: "Products", icon: Package },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/manage-combos", label: "Combos", icon: Gift },
  { to: "/deals", label: "Deal Store", icon: Zap },
  { to: "/coupons", label: "Coupons", icon: TicketPercent },
] as const;


export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (router) => router.location.pathname });

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border p-3">
          <div className="flex h-10 items-center gap-3 overflow-hidden px-1">
            <div className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
              U
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold">{SHOP.name}</p>
              <p className="text-[11px] text-muted-foreground">Seller desk</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="py-2">
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {LINKS.map((item) => {
                  const active =
                    currentPath === item.to ||
                    (item.to === "/enquiries" && currentPath.startsWith("/enquiries/"));
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className="h-9"
                      >
                        <Link to={item.to}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Sign out"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/auth" });
                }}
              >
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 bg-muted/40">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-border bg-background/90 px-4 backdrop-blur-md">
          <SidebarTrigger className="size-8" />
          <div className="ml-3 min-w-0">
            <p className="truncate text-sm font-semibold">Seller desk</p>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              Catalogue, enquiries and performance
            </p>
          </div>
        </header>
        <main className="w-full min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
