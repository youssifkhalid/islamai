import { useState } from "react";
import { Palette, Check } from "lucide-react";
import { THEMES, useTheme } from "@/lib/theme";

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="ts-btn"
        aria-label="تغيير الثيم"
        title="تغيير الثيم"
      >
        <Palette className="w-4 h-4" />
        {!compact && <span className="text-xs font-bold">ثيم</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="ts-panel">
            <div className="text-[11px] uppercase tracking-widest opacity-60 mb-2 px-2">اختر هويتك</div>
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setOpen(false); }}
                className={`ts-item ${theme === t.id ? "is-active" : ""}`}
              >
                <span className="text-2xl">{t.emoji}</span>
                <span className="flex-1 text-right">
                  <span className="block font-bold">{t.name}</span>
                  <span className="block text-[11px] opacity-60">{t.tagline}</span>
                </span>
                {theme === t.id && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}