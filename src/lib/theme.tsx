import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "aurora" | "mihrab" | "noor" | "cosmos";

export const THEMES: { id: Theme; name: string; emoji: string; tagline: string }[] = [
  { id: "aurora", name: "Aurora", emoji: "🌌", tagline: "ليلي ذهبي" },
  { id: "mihrab", name: "Mihrab", emoji: "🕌", tagline: "كلاسيكي عثماني" },
  { id: "noor", name: "Noor", emoji: "✨", tagline: "حداثي مينيمال" },
  { id: "cosmos", name: "Cosmos", emoji: "🌠", tagline: "سماء النجوم" },
];

type Ctx = { theme: Theme; setTheme: (t: Theme) => void };
const ThemeCtx = createContext<Ctx>({ theme: "aurora", setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("aurora");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("islamaii.theme") as Theme | null;
      if (saved && ["aurora", "mihrab", "noor", "cosmos"].includes(saved)) {
        setThemeState(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("islamaii.theme", theme); } catch {}
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);