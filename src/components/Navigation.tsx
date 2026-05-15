import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Sparkles, Home, Download, Headphones, LogIn, LogOut, Clock, BookOpenCheck, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useAuth } from "@/hooks/useAuth";

export function Navigation() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const { canInstall, install, installed } = usePWAInstall();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { to: "/", label: "الرئيسية", icon: Home },
    { to: "/read", label: "القرآن", icon: BookOpen },
    { to: "/prayer", label: "الصلاة", icon: Clock },
    { to: "/hadith", label: "الحديث", icon: BookOpenCheck },
    { to: "/reciters", label: "القرّاء", icon: Headphones },
    { to: "/training", label: "تدريب", icon: GraduationCap },
    { to: "/ai", label: "المساعد", icon: Sparkles },
  ];

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "py-2" : "py-4"}`}>
      <div className={`container mx-auto px-2 sm:px-4 flex items-center justify-between rounded-2xl transition-all duration-500 ${scrolled ? "glass py-2 px-3" : ""}`}>
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform"
               style={{ background: "var(--gradient-primary)" }}>
            ☪
          </div>
          <span className="font-bold text-lg gradient-text hidden md:inline">المصحف الشريف</span>
        </Link>

        <nav className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {links.map((l) => {
            const Icon = l.icon;
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-1 px-2 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 ${
                  active ? "bg-primary/15 text-primary" : "text-foreground/70 hover:text-primary hover:bg-primary/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden lg:inline">{l.label}</span>
              </Link>
            );
          })}
          {user ? (
            <Button onClick={() => signOut()} size="sm" variant="ghost" className="gap-1 text-foreground/70 hover:text-primary mr-1 px-2">
              <LogOut className="w-4 h-4" />
            </Button>
          ) : (
            <Link to="/auth" className="flex items-center gap-1 px-2 py-2 rounded-xl text-xs sm:text-sm font-medium text-foreground/70 hover:text-primary hover:bg-primary/10">
              <LogIn className="w-4 h-4" />
            </Link>
          )}
          {canInstall && !installed && (
            <Button onClick={install} size="sm" className="btn-gold mr-1 gap-1 px-2">
              <Download className="w-4 h-4" />
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
