import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  BellRing,
  BookOpen,
  Gift,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Package,
  PlusCircle,
  Settings,
  StickyNote,
  Tags,
  TicketPercent,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { SHOP } from "@/lib/shop";

const WORK_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/enquiries", label: "Enquiries", icon: ListChecks },
  { to: "/follow-ups", label: "Follow-ups", icon: BellRing },
  { to: "/new-enquiry", label: "New enquiry", icon: PlusCircle },
  { to: "/reports", label: "Reports", icon: BarChart3 },
] as const;

const CATALOGUE_LINKS = [
  { to: "/products", label: "Products", icon: Package },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/manage-combos", label: "Combos", icon: Gift },
  { to: "/deals", label: "Deal Store", icon: Zap },
  { to: "/coupons", label: "Coupons", icon: TicketPercent },
] as const;

const SETTINGS_LINKS = [
  { to: "/guide", label: "Guide", icon: BookOpen },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const NOTES_KEY = "upcurv-sticky-notes";

/** Count of enquiries the seller has not opened yet; chimes when a new one arrives. */
export function useUnseenEnquiries() {
  const previous = useRef<number | null>(null);
  const { data } = useQuery({
    queryKey: ["admin", "enquiries", "unseen"],
    refetchInterval: 20000,
    staleTime: 0,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("enquiries")
        .select("id", { count: "exact", head: true })
        .is("seen_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const count = data ?? 0;
  useEffect(() => {
    if (previous.current !== null && count > previous.current) {
      try {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          const play = (freq: number, at: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
            gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + at + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.28);
            osc.connect(gain).connect(ctx.destination);
            osc.start(ctx.currentTime + at);
            osc.stop(ctx.currentTime + at + 0.3);
          };
          play(880, 0);
          play(1170, 0.16);
          setTimeout(() => void ctx.close(), 900);
        }
      } catch {
        /* sound is best-effort */
      }
    }
    previous.current = count;
  }, [count]);

  return count;
}

function CountDot({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={`grid min-w-[18px] place-items-center rounded-full bg-report-rose px-1 text-[10px] font-bold leading-[18px] text-white ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <div className="hidden text-right leading-tight sm:block">
      <p className="text-sm font-semibold tabular-nums">
        {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
      </p>
    </div>
  );
}

function StickyNotes() {
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setText(localStorage.getItem(NOTES_KEY) ?? "");
    setLoaded(true);
  }, []);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8" aria-label="Sticky notes">
          <StickyNote className="size-4" />
          {loaded && text.trim() !== "" && (
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-report-rose" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-semibold">Sticky notes</p>
        <p className="text-[11px] text-muted-foreground">Quick reminders saved on this device.</p>
        <Textarea
          value={text}
          rows={7}
          placeholder="Call Ramesh at 6pm…"
          className="mt-2 resize-none"
          onChange={(e) => {
            setText(e.target.value);
            localStorage.setItem(NOTES_KEY, e.target.value);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function NavGroup({
  label,
  items,
  currentPath,
  badges = {},
}: {
  label: string;
  items: readonly { to: string; label: string; icon: React.ComponentType }[];
  currentPath: string;
  badges?: Record<string, number>;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active =
              currentPath === item.to ||
              (item.to === "/enquiries" && currentPath.startsWith("/enquiries/"));
            return (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.label} className="h-9">
                  <Link to={item.to}>
                    <span className="relative flex shrink-0 items-center">
                      <item.icon />
                      {(badges[item.to] ?? 0) > 0 && (
                        <span className="absolute -right-1 -top-1 size-2 rounded-full bg-report-rose group-data-[collapsible=icon]:block" />
                      )}
                    </span>
                    <span>{item.label}</span>
                    <CountDot count={badges[item.to] ?? 0} className="ml-auto" />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (router) => router.location.pathname });
  const unseen = useUnseenEnquiries();

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
          <NavGroup label="Workspace" items={WORK_LINKS} currentPath={currentPath} />
          <NavGroup label="Catalogue" items={CATALOGUE_LINKS} currentPath={currentPath} />
          <NavGroup
            label="Help"
            items={[{ to: "/guide", label: "Guide", icon: BookOpen }]}
            currentPath={currentPath}
          />
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
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-md sm:px-4">
          <SidebarTrigger className="size-8" />
          <div className="ml-1 min-w-0">
            <p className="truncate text-sm font-semibold">Seller desk</p>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              Catalogue, enquiries and performance
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" asChild>
                  <Link to="/follow-ups" aria-label="Follow-ups">
                    <BellRing className="size-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Follow-ups</TooltipContent>
            </Tooltip>
            <StickyNotes />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" asChild>
                  <Link to="/guide" aria-label="How to use">
                    <BookOpen className="size-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>How to use this platform</TooltipContent>
            </Tooltip>
            <div className="mx-1 hidden h-7 w-px bg-border sm:block" />
            <Clock />
          </div>
        </header>
        <main className="w-full min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
