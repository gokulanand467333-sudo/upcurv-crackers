import { Link } from "@tanstack/react-router";
import { Menu, Phone, ShoppingBag, MessageCircle } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart, useSource } from "@/lib/enquiry-cart";
import { useLang } from "@/lib/i18n";
import { LEGAL_NOTICE, LEGAL_NOTICE_TA, SAFETY_NOTICE, SHOP } from "@/lib/shop";

const NAV = [
  { to: "/catalogue", label: "Catalogue", labelTa: "அட்டவணை" },
  { to: "/build-box", label: "Build My Box", labelTa: "என் பெட்டி" },
  { to: "/combos", label: "Combos", labelTa: "காம்போ" },
  { to: "/track", label: "Track", labelTa: "நிலை" },
] as const;

export function LegalNotice({ compact = false }: { compact?: boolean }) {
  const { lang } = useLang();
  return (
    <div
      className={`rounded-xl border border-border bg-accent/60 px-4 py-3 text-accent-foreground ${
        compact ? "text-[11px] leading-relaxed" : "text-xs leading-relaxed"
      }`}
    >
      <p>{lang === "ta" ? LEGAL_NOTICE_TA : LEGAL_NOTICE}</p>
      {!compact && <p className="mt-2 opacity-80">{SAFETY_NOTICE}</p>}
    </div>
  );
}

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center rounded-full border border-border p-0.5 text-xs">
      <button
        onClick={() => setLang("ta")}
        className={`rounded-full px-2.5 py-1 ${lang === "ta" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
      >
        தமிழ்
      </button>
      <button
        onClick={() => setLang("en")}
        className={`rounded-full px-2.5 py-1 ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
      >
        EN
      </button>
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const { count } = useCart();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  useSource();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-6">
              <nav className="mt-8 flex flex-col gap-1">
                {NAV.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent"
                  >
                    {lang === "ta" ? n.labelTa : n.label}
                  </Link>
                ))}
                <a
                  href={`tel:${SHOP.phoneDial}`}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent"
                >
                  {SHOP.phone}
                </a>
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-base text-primary-foreground">
              🎇
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              {SHOP.name}
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {lang === "ta" ? n.labelTa : n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
            <Button asChild size="sm" className="relative">
              <Link to="/enquiry">
                <ShoppingBag className="size-4" />
                <span className="hidden sm:inline">Enquiry</span>
                {count > 0 && (
                  <span className="ml-1 rounded-full bg-primary-foreground px-1.5 text-xs font-semibold text-primary">
                    {count}
                  </span>
                )}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-border bg-secondary/50">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 className="text-lg font-semibold">{SHOP.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{SHOP.tagline}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              {SHOP.addressLines.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </p>
          </div>
          <div className="text-sm">
            <h4 className="font-semibold">Contact</h4>
            <a
              href={`tel:${SHOP.phoneDial}`}
              className="mt-2 flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Phone className="size-4" /> {SHOP.phone}
            </a>
            <a
              href={`https://wa.me/${SHOP.whatsapp}`}
              className="mt-1 flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="size-4" /> WhatsApp
            </a>
            <p className="mt-2 text-muted-foreground">{SHOP.hours}</p>
            <p className="mt-2 text-muted-foreground">{SHOP.email}</p>
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <LegalNotice />
            <p className="mt-3 text-[11px] text-muted-foreground">{SHOP.licence}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
