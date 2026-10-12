import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FA } from "./strings/fa";

export type Lang = "en" | "fa";
const STORAGE_KEY = "archlab.lang";

interface LangCtx {
  lang: Lang;
  isFa: boolean;
  setLang: (l: Lang) => void;
  /** Translate: looks the English string up in the Farsi dictionary, falls back to the key itself. Returns ReactNode. */
  t: (key: string) => ReactNode;
  /** String-only variant for props typed as `string` (tooltips, document.title). */
  ts: (key: string) => string;
  /** Translate a "{param}"-templated string with substitutions. */
  tf: (key: string, params: Record<string, string | number>) => string;
}

const Ctx = createContext<LangCtx | null>(null);

function readStored(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "fa" || v === "en") return v;
  } catch {
    /* private mode — default below */
  }
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStored);

  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang === "fa" ? "fa" : "en";
    el.dir = lang === "fa" ? "rtl" : "ltr";
    const title = "ArchLab — Interactive Computer Architecture";
    const faTitle = FA[title];
    document.title = lang === "fa" && typeof faTitle === "string" ? faTitle : title;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback(
    (key: string): ReactNode => (lang === "fa" ? (FA[key] ?? key) : key),
    [lang],
  );
  const ts = useCallback(
    (key: string): string => {
      if (lang !== "fa") return key;
      const v = FA[key];
      return typeof v === "string" ? v : key;
    },
    [lang],
  );
  const tf = useCallback(
    (key: string, params: Record<string, string | number>): string => {
      let s = ts(key);
      for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
      return s;
    },
    [ts],
  );

  const value = useMemo(() => ({ lang, isFa: lang === "fa", setLang, t, ts, tf }), [lang, setLang, t, ts, tf]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLang must be used inside <LanguageProvider>");
  return c;
}
