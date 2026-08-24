import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ta";

const dict = {
  browse: { en: "Browse Crackers", ta: "பட்டாசுகளை பார்க்க" },
  buildBox: { en: "Build My Diwali Box", ta: "என் தீபாவளி பெட்டி" },
  combos: { en: "View Combos", ta: "காம்போ பார்க்க" },
  sendEnquiry: { en: "Send Enquiry", ta: "விசாரணை அனுப்பு" },
  myEnquiry: { en: "My Diwali Enquiry", ta: "என் தீபாவளி விசாரணை" },
  addToEnquiry: { en: "Add to Enquiry", ta: "விசாரணையில் சேர்" },
  added: { en: "Added", ta: "சேர்க்கப்பட்டது" },
  catalogue: { en: "Catalogue", ta: "அட்டவணை" },
  track: { en: "Track Enquiry", ta: "விசாரணை நிலை" },
  available: { en: "Available", ta: "கிடைக்கிறது" },
  limited: { en: "Limited availability", ta: "குறைவாக உள்ளது" },
  unavailable: { en: "Currently unavailable", ta: "இப்போது இல்லை" },
  enquiry_only: { en: "Ask availability", ta: "கிடைப்பதை கேளுங்கள்" },
  estimated: { en: "Estimated catalogue value", ta: "மதிப்பீட்டு தொகை" },
  search: { en: "Search name or code (CRK-142)", ta: "பெயர் அல்லது குறியீடு தேடுங்கள்" },
  allCategories: { en: "All categories", ta: "அனைத்து வகைகள்" },
  emptyCart: { en: "Your enquiry list is empty.", ta: "உங்கள் விசாரணை பட்டியல் காலியாக உள்ளது." },
} as const;

export type TKey = keyof typeof dict;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => dict[k].en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("upcurv-lang");
    if (saved === "ta" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("upcurv-lang", l);
  };

  return (
    <Ctx.Provider value={{ lang, setLang, t: (k) => dict[k][lang] }}>{children}</Ctx.Provider>
  );
}

export const useLang = () => useContext(Ctx);

export function pick(lang: Lang, en: string, ta?: string | null) {
  return lang === "ta" && ta ? ta : en;
}
