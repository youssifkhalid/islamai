import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState, ReactNode } from "react";
import { BookOpen, Sparkles, Home, Headphones, LogIn, LogOut, Clock, BookOpenCheck, GraduationCap, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/lib/theme";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const LINKS = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/read", label: "القرآن", icon: BookOpen },
  { to: "/prayer", label: "الصلاة", icon: Clock },
  { to: "/hadith", label: "الحديث", icon: BookOpenCheck },
  { to: "/reciters", label: "القرّاء", icon: Headphones },
  { to: "/training", label: "تدريب", icon: GraduationCap },
  { to: "/ai", label: "المساعد", icon: Sparkles },
] as const;

function Brand({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "w-12 h-12 text-3xl" : size === "sm" ? "w-9 h-9 text-xl" : "w-10 h-10 text-2xl";
  const txt = size === "lg" ? "text-2xl" : "text-lg";
  return (
    <Link to="/" className="flex items-center gap-2 group shrink-0">
      <div className={`${dim} rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform`}
           style={{ background: "var(--gradient-primary)" }}>
        ☪
      </div>
      <span className={`brand-name font-black ${txt} gradient-text tracking-wider`}>islamaii</span>
    </Link>
  );
}

function AuthBtn() {
  const { user, signOut } = useAuth();
  return user ? (
    <Button onClick={() => signOut()} size="sm" variant="ghost" className="gap-1 px-2"><LogOut className="w-4 h-4" /></Button>
  ) : (
    <Link to="/auth" className="px-2 py-2"><LogIn className="w-4 h-4" /></Link>
  );
}

/* ---------- AURORA: classic top glass bar ---------- */
function AuroraNav() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "py-2" : "py-4"}`}>
      <div className={`container mx-auto px-2 sm:px-4 flex items-center justify-between rounded-2xl transition-all duration-500 ${scrolled ? "glass py-2 px-3" : ""}`}>
        <Brand />
        <nav className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {LINKS.map((l) => {
            const Icon = l.icon;
            const active = pathname === l.to;
            return (
              <Link key={l.to} to={l.to}
                className={`flex items-center gap-1 px-2 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 ${active ? "bg-primary/15 text-primary" : "text-foreground/70 hover:text-primary hover:bg-primary/10"}`}>
                <Icon className="w-4 h-4" />
                <span className="hidden lg:inline">{l.label}</span>
              </Link>
            );
          })}
          <ThemeSwitcher compact />
          <AuthBtn />
        </nav>
      </div>
    </header>
  );
}

/* ---------- MIHRAB: vertical right sidebar with arches ---------- */
function MihrabNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="mihrab-trigger lg:hidden"><Menu /></button>
      <aside className={`mihrab-aside ${open ? "is-open" : ""}`}>
        <button onClick={() => setOpen(false)} className="lg:hidden absolute top-4 left-4 text-primary"><X /></button>
        <div className="mihrab-arch-top" />
        <div className="mihrab-brand"><Brand size="lg" /></div>
        <div className="mihrab-divider" />
        <nav className="mihrab-nav">
          {LINKS.map((l, i) => {
            const Icon = l.icon;
            const active = pathname === l.to;
            return (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`mihrab-link ${active ? "is-active" : ""}`}>
                <Icon className="w-5 h-5" />
                <span>{l.label}</span>
                <span className="mihrab-link-deco" />
              </Link>
            );
          })}
        </nav>
        <div className="mihrab-divider" />
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <ThemeSwitcher />
          <AuthBtn />
        </div>
        <div className="mihrab-arch-bot" />
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}

/* ---------- NOOR: floating bottom dock ---------- */
function NoorNav() {
  const { pathname } = useLocation();
  return (
    <>
      <header className="noor-top">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeSwitcher compact />
          <AuthBtn />
        </div>
      </header>
      <nav className="noor-dock">
        {LINKS.map((l) => {
          const Icon = l.icon;
          const active = pathname === l.to;
          return (
            <Link key={l.to} to={l.to} className={`noor-dock-item ${active ? "is-active" : ""}`} title={l.label}>
              <Icon className="w-5 h-5" />
              <span className="noor-tip">{l.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

/* ---------- COSMOS: radial expanding menu ---------- */
function CosmosNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="cosmos-top">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeSwitcher compact />
          <AuthBtn />
        </div>
      </header>
      <button onClick={() => setOpen((o) => !o)} className={`cosmos-fab ${open ? "is-open" : ""}`} aria-label="القائمة">
        <span className="cosmos-orbit-ring" />
        <span className="cosmos-orbit-ring r2" />
        {open ? "✕" : "☰"}
      </button>
      <div className={`cosmos-radial ${open ? "is-open" : ""}`}>
        {LINKS.map((l, i) => {
          const Icon = l.icon;
          const active = pathname === l.to;
          const angle = (i / LINKS.length) * Math.PI - Math.PI / 2;
          const radius = 140;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          return (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
              className={`cosmos-radial-item ${active ? "is-active" : ""}`}
              style={{ transform: open ? `translate(${x}px, ${y}px)` : "translate(0,0)", transitionDelay: `${i * 40}ms` }}>
              <Icon className="w-5 h-5" />
              <span className="cosmos-tip">{l.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

/* ---------- Backgrounds ---------- */
function StarsCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let raf = 0;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height,
      r: Math.random() * 1.6 + 0.3, a: Math.random(), s: Math.random() * 0.02 + 0.005,
    }));
    const shoot: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
    let lastShoot = 0;
    const draw = (t: number) => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const s of stars) {
        s.a += s.s; const a = (Math.sin(s.a) + 1) / 2;
        ctx.fillStyle = `rgba(220, 200, 255, ${0.3 + a * 0.7})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      if (t - lastShoot > 2200) {
        lastShoot = t;
        shoot.push({ x: Math.random() * c.width, y: Math.random() * c.height * 0.5, vx: -3 - Math.random() * 2, vy: 2 + Math.random() * 1.5, life: 1 });
      }
      for (let i = shoot.length - 1; i >= 0; i--) {
        const sh = shoot[i]; sh.x += sh.vx * 4; sh.y += sh.vy * 4; sh.life -= 0.015;
        if (sh.life <= 0) { shoot.splice(i, 1); continue; }
        const grad = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * 8, sh.y - sh.vy * 8);
        grad.addColorStop(0, `rgba(255,255,255,${sh.life})`); grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = grad; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x - sh.vx * 8, sh.y - sh.vy * 8); ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="fixed inset-0 z-0 pointer-events-none" />;
}

function ThemedBackground() {
  const { theme } = useTheme();
  if (theme === "aurora") {
    return (<>
      <div className="bg-orbs" />
      <div className="bg-rings"><span /><span /><span /></div>
      <div className="bg-grain" />
    </>);
  }
  if (theme === "mihrab") {
    return (<>
      <div className="mihrab-bg" />
      <div className="mihrab-pattern" />
      <div className="bg-grain" />
    </>);
  }
  if (theme === "noor") {
    return (<>
      <div className="noor-grid" />
      <div className="noor-blob" />
      <div className="noor-blob noor-blob-2" />
    </>);
  }
  return <>
    <div className="cosmos-bg" />
    <StarsCanvas />
    <div className="cosmos-moon" />
  </>;
}

/* ---------- Main shell ---------- */
export function ThemedShell({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const Nav =
    theme === "mihrab" ? MihrabNav :
    theme === "noor"   ? NoorNav   :
    theme === "cosmos" ? CosmosNav : AuroraNav;

  const mainClass =
    theme === "mihrab" ? "relative z-10 lg:mr-72 pt-20 lg:pt-8 min-h-screen" :
    theme === "noor"   ? "relative z-10 pt-20 pb-32 min-h-screen" :
    theme === "cosmos" ? "relative z-10 pt-20 pb-32 min-h-screen" :
                         "relative z-10 pt-20 min-h-screen";

  return (
    <div data-theme={theme} className={`themed-root theme-${theme}`}>
      <ThemedBackground />
      <Nav />
      <main className={mainClass}>
        <div className="page-enter">{children}</div>
      </main>
    </div>
  );
}
