import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Headphones, Search, Download, Star, Clock, BookOpenCheck, GraduationCap } from "lucide-react";
import heroImg from "@/assets/hero-quran.jpg";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Reveal } from "@/components/Reveal";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "islamaii ✦ منصة إسلامية متكاملة" },
      { name: "description", content: "islamaii — اقرأ القرآن، استمع لأشهر القراء، تابع الصلوات، تدرّب على التلاوة بـ AI، واسأل المساعد الإسلامي." },
    ],
  }),
});

function Index() {
  const { canInstall, installed, install } = usePWAInstall();
  const { theme } = useTheme();

  const features = [
    { icon: BookOpen, title: "114 سورة", desc: "كامل المصحف بالرسم العثماني" },
    { icon: Headphones, title: "أشهر القراء", desc: "العفاسي، السديس، الحصري وغيرهم" },
    { icon: Clock, title: "مواقيت الصلاة", desc: "حسب موقعك مع الأذان" },
    { icon: BookOpenCheck, title: "الأحاديث", desc: "صحيح البخاري ومسلم" },
    { icon: GraduationCap, title: "تدريب ذكي", desc: "AI يصحح تلاوتك خطوة بخطوة" },
    { icon: Sparkles, title: "AI إسلامي", desc: "إجابات بمصادر موثقة فقط" },
  ];

  /* ===== MIHRAB layout: split with sidebar story ===== */
  if (theme === "mihrab") {
    return (
      <div className="container mx-auto px-6 pb-20 max-w-6xl" suppressHydrationWarning>
        <Reveal variant="mask" className="mt-8">
          <div className="text-center py-12 border-y-4 border-double" style={{ borderColor: "var(--primary)" }}>
            <div className="text-6xl mb-4">﴾﴿</div>
            <h1 className="quran-text text-5xl sm:text-6xl font-bold mb-3 gradient-text">islamaii</h1>
            <p className="text-xl text-foreground/70">منصة إسلامية بروح كلاسيكية</p>
          </div>
        </Reveal>
        <div className="grid lg:grid-cols-3 gap-8 mt-12">
          <Reveal variant="right" className="lg:col-span-1">
            <div className="glass rounded-xl p-6 sticky top-8">
              <h2 className="font-bold text-2xl mb-4 gradient-text">ابدأ هنا</h2>
              <div className="space-y-3">
                <Link to="/read"><Button className="w-full justify-start gap-2 btn-gold"><BookOpen className="w-4 h-4" />القرآن الكريم</Button></Link>
                <Link to="/training"><Button variant="outline" className="w-full justify-start gap-2"><GraduationCap className="w-4 h-4" />التدريب الذكي</Button></Link>
                <Link to="/ai"><Button variant="outline" className="w-full justify-start gap-2"><Sparkles className="w-4 h-4" />المساعد</Button></Link>
              </div>
            </div>
          </Reveal>
          <div className="lg:col-span-2 space-y-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={i} variant="right" delay={i * 80}>
                  <div className="glass rounded-xl p-5 flex items-center gap-4 hover:translate-x-[-6px] transition-transform">
                    <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--gradient-primary)" }}>
                      <Icon className="w-7 h-7" style={{ color: "var(--primary-foreground)" }} />
                    </div>
                    <div className="flex-1"><h3 className="font-bold text-lg">{f.title}</h3><p className="text-sm text-muted-foreground">{f.desc}</p></div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ===== NOOR layout: minimal split ===== */
  if (theme === "noor") {
    return (
      <div className="container mx-auto px-6 pb-32 max-w-7xl" suppressHydrationWarning>
        <section className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
          <Reveal variant="left">
            <div className="text-[11px] uppercase tracking-[0.3em] text-primary font-bold mb-4">A new islamic experience</div>
            <h1 className="text-6xl sm:text-7xl font-black mb-6 leading-[1.1]">
              <span className="block">islamaii.</span>
              <span className="block gradient-text">القرآن. الصلاة. الذكاء.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-md">منصة بسيطة وحديثة لكل ما تحتاجه في رحلتك الإسلامية اليومية — بدون تعقيد.</p>
            <div className="flex gap-3">
              <Link to="/read"><Button size="lg" className="btn-gold gap-2 h-12 px-6">ابدأ <span>→</span></Button></Link>
              <Link to="/training"><Button size="lg" variant="outline" className="h-12 px-6">جرّب التدريب</Button></Link>
            </div>
          </Reveal>
          <Reveal variant="right" delay={120}>
            <div className="grid grid-cols-2 gap-3">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="glass rounded-2xl p-5" style={{ animationDelay: `${i * 60}ms` }}>
                    <Icon className="w-6 h-6 text-primary mb-3" />
                    <h3 className="font-bold mb-1">{f.title}</h3>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </section>
      </div>
    );
  }

  /* ===== COSMOS layout: asymmetric scattered ===== */
  if (theme === "cosmos") {
    return (
      <div className="container mx-auto px-4 pb-32 max-w-7xl" suppressHydrationWarning>
        <Reveal variant="scale" className="mt-8">
          <div className="relative text-center py-24">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[480px] h-[480px] rounded-full border border-primary/20 animate-[spin-slow_30s_linear_infinite]" />
              <div className="absolute w-[320px] h-[320px] rounded-full border border-secondary/30 animate-[spin-slow_18s_linear_reverse_infinite]" />
            </div>
            <div className="relative z-10">
              <div className="text-7xl mb-6 animate-[float-orb_8s_ease-in-out_infinite]">🌌</div>
              <h1 className="text-7xl sm:text-8xl font-black gradient-text mb-4 tracking-tight">islamaii</h1>
              <p className="text-xl text-foreground/70 mb-8">رحلة إسلامية بين النجوم</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link to="/read"><Button size="lg" className="btn-gold gap-2 h-12 px-8 rounded-full">ادخل العالم</Button></Link>
                <Link to="/ai"><Button size="lg" variant="outline" className="h-12 px-8 rounded-full border-primary/40">المساعد ✦</Button></Link>
              </div>
            </div>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
          {features.map((f, i) => {
            const Icon = f.icon;
            const variants = ["up", "scale", "rotate", "left", "right", "down"] as const;
            return (
              <Reveal key={i} variant={variants[i % variants.length]} delay={i * 100}>
                <div className="glass p-7 hover:scale-[1.04] hover:-translate-y-2 transition-all duration-500"
                     style={{ marginTop: i % 2 === 0 ? "0" : "32px" }}>
                  <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center" style={{ background: "var(--gradient-primary)", boxShadow: "0 0 30px var(--primary)" }}>
                    <Icon className="w-7 h-7" style={{ color: "var(--primary-foreground)" }} />
                  </div>
                  <h3 className="font-bold text-xl mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    );
  }

  /* ===== AURORA (default) ===== */
  return (
    <div className="container mx-auto px-4 pb-20" suppressHydrationWarning>
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl glass mt-4 mb-16" suppressHydrationWarning>
        <div className="absolute inset-0 opacity-30">
          <img src={heroImg} alt="" className="w-full h-full object-cover" width={1536} height={1024} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent, var(--background) 90%)" }} />
        </div>
        <div className="aurora" />
        <div className="relative z-10 px-6 sm:px-12 py-20 sm:py-28 text-center">
          <div className="anim-fade-down inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm mb-6">
            <Star className="w-4 h-4 text-primary" />
            <span>تطبيق إسلامي عصري ومتكامل</span>
          </div>
          <h1 className="anim-fade-up text-5xl sm:text-7xl font-black mb-4 gradient-text leading-tight tracking-tight" style={{ animationDelay: ".1s" }}>
            ✦ islamaii ✦
          </h1>
          <p className="anim-fade-up text-lg sm:text-xl text-foreground/80 max-w-2xl mx-auto mb-8" style={{ animationDelay: ".2s" }}>
            اقرأ القرآن، استمع لأشهر القراء، تابع مواقيت الصلاة، تدرّب على التلاوة بالذكاء الاصطناعي، واسأل المساعد الإسلامي بمصادر موثقة.
          </p>
          <div className="anim-scale flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: ".3s" }}>
            <Link to="/read">
              <Button size="lg" className="btn-gold gap-2 text-base h-12 px-6">
                <BookOpen className="w-5 h-5" /> ابدأ القراءة
              </Button>
            </Link>
            <Link to="/ai">
              <Button size="lg" variant="outline" className="gap-2 text-base h-12 px-6 border-primary/40 hover:bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" /> اسأل المساعد
              </Button>
            </Link>
            <Link to="/reciters">
              <Button size="lg" variant="outline" className="gap-2 text-base h-12 px-6 border-primary/40 hover:bg-primary/10">
                <Headphones className="w-5 h-5 text-primary" /> القرّاء
              </Button>
            </Link>
            {canInstall && !installed && (
              <Button size="lg" onClick={install} className="btn-gold gap-2 text-base h-12 px-6">
                <Download className="w-5 h-5" /> تحميل التطبيق
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
        {features.map((f, i) => {
          const Icon = f.icon;
          const variants = ["up", "left", "right", "scale", "down", "rotate"] as const;
          return (
            <Reveal key={i} variant={variants[i % variants.length]} delay={i * 80}>
              <div className="glass rounded-2xl p-6 hover:scale-105 transition-transform group h-full">
                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center group-hover:scale-110 transition-transform"
                     style={{ background: "var(--gradient-primary)" }}>
                  <Icon className="w-6 h-6" style={{ color: "var(--primary-foreground)" }} />
                </div>
                <h3 className="font-bold text-lg mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </Reveal>
          );
        })}
      </section>

      {/* CTA */}
      <Reveal variant="scale">
        <section className="glass rounded-3xl p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ background: "var(--gradient-emerald)" }} />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 gradient-text">ابدأ رحلتك الآن</h2>
            <p className="text-foreground/80 mb-6 max-w-xl mx-auto">ثبّت التطبيق على هاتفك واستمتع بتجربة كاملة بدون اتصال.</p>
            <Link to="/read"><Button size="lg" className="btn-gold gap-2 h-12 px-8"><BookOpen className="w-5 h-5" /> افتح المصحف</Button></Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
