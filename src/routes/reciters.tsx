import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Play, Pause, Loader2, Download, Check, ChevronLeft, MapPin, BookOpen, SkipBack, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { RECITERS, type Reciter } from "@/lib/reciters";
import { fullSurahUrl } from "@/lib/quranAudio";

export const Route = createFileRoute("/reciters")({
  component: RecitersPage,
  head: () => ({
    meta: [
      { title: "القرّاء — استمع للسور كاملة بدون تقطيع" },
      { name: "description", content: "تصفح أشهر قراء القرآن، استمع للسور كاملة بصوت واحد متصل وبأعلى جودة." },
    ],
  }),
});

type Surah = { number: number; name: string; englishName: string; numberOfAyahs: number };

// تطبيع النص العربي: إزالة التشكيل والهمزات لتسهيل البحث
const normalizeAr = (s: string) =>
  s
    .replace(/[\u064B-\u0652\u0670\u0610-\u061A\u06D6-\u06ED]/g, "") // diacritics
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

function RecitersPage() {
  const [selected, setSelected] = useState<Reciter | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return RECITERS;
    const q = normalizeAr(search);
    return RECITERS.filter((r) =>
      normalizeAr(r.name).includes(q) ||
      normalizeAr(r.country).includes(q) ||
      (r.aliases ?? []).some((a) => normalizeAr(a).includes(q))
    );
  }, [search]);

  return (
    <div className="container mx-auto px-4 pb-32">
      <div className="anim-fade-down text-center mb-8 mt-4">
        <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-2">قرّاء القرآن الكريم</h1>
        <p className="text-muted-foreground">سور كاملة بصوت متصل — بدون تقطيع</p>
      </div>

      {!selected ? (
        <>
          <div className="max-w-md mx-auto mb-6 anim-fade-up">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن شيخ..." className="pr-10 glass border-primary/20 h-12" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r, i) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="anim-fade-up glass rounded-2xl p-5 text-right group hover:border-primary/60 hover:scale-[1.02] transition-all tilt"
                style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-2xl font-bold group-hover:rotate-6 transition-transform"
                       style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>☪</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg leading-tight">{r.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />{r.country} · {r.style ?? "مرتل"}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{r.bio}</p>
                <div className="mt-3 text-xs text-primary flex items-center gap-1 font-medium">
                  <BookOpen className="w-3.5 h-3.5" /> ١١٤ سورة كاملة
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <ReciterDetail reciter={selected} onBack={() => setSelected(null)} />
      )}
    </div>
  );
}

function ReciterDetail({ reciter, onBack }: { reciter: Reciter; onBack: () => void }) {
  const [activeSurah, setActiveSurah] = useState<Surah | null>(null);
  const [search, setSearch] = useState("");

  const { data: surahs } = useQuery<Surah[]>({
    queryKey: ["surahs"],
    queryFn: async () => {
      const res = await fetch("https://api.alquran.cloud/v1/surah");
      const json = await res.json();
      return json.data;
    },
  });

  const filtered = useMemo(() => {
    if (!surahs) return [];
    const q = normalizeAr(search);
    if (!q) return surahs;
    return surahs.filter(
      (s) =>
        normalizeAr(s.name).includes(q) ||
        normalizeAr(s.englishName).includes(q) ||
        String(s.number) === q
    );
  }, [surahs, search]);

  return (
    <div className="anim-fade-up max-w-5xl mx-auto">
      {activeSurah && surahs && (
        <PlayerBar
          reciter={reciter}
          surah={activeSurah}
          surahs={surahs}
          onChange={(s) => setActiveSurah(s)}
          onClose={() => setActiveSurah(null)}
        />
      )}
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-4">
        <ChevronLeft className="w-4 h-4 rotate-180" /> العودة للقراء
      </Button>

      <div className="glass rounded-3xl p-6 sm:p-8 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-3xl shrink-0 flex items-center justify-center text-4xl font-bold"
               style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>☪</div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold gradient-text mb-1">{reciter.name}</h2>
            <div className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
              <MapPin className="w-3.5 h-3.5" />{reciter.country} · {reciter.style ?? "مرتل"}
            </div>
            <p className="leading-relaxed text-foreground/90">{reciter.bio}</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن سورة..." className="pr-10 glass border-primary/20" />
        </div>
      </div>

      {!surahs ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 pb-12">
          {filtered.map((s, i) => (
            <SurahCard
              key={s.number}
              surah={s}
              reciter={reciter}
              isActive={activeSurah?.number === s.number}
              onSelect={() => setActiveSurah(s)}
              delay={Math.min(i, 20)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SurahCard({ surah, reciter, isActive, onSelect, delay }: {
  surah: Surah; reciter: Reciter; isActive: boolean; onSelect: () => void; delay: number;
}) {
  return (
    <button
      onClick={onSelect}
      className={`anim-fade-up glass rounded-2xl p-3 flex items-center gap-3 text-right transition-all hover:border-primary/60 hover:scale-[1.01] ${isActive ? "border-primary/70 ring-2 ring-primary/30" : ""}`}
      style={{ animationDelay: `${delay * 0.02}s` }}
    >
      <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center font-bold"
           style={{ background: isActive ? "var(--gradient-primary)" : "oklch(0.25 0.03 260)", color: isActive ? "var(--primary-foreground)" : "var(--foreground)" }}>
        {isActive ? <Play className="w-4 h-4" /> : surah.number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold quran-text" style={{ fontSize: "1.3rem", lineHeight: 1.3 }}>{surah.name}</div>
        <div className="text-xs text-muted-foreground">{surah.englishName} · {surah.numberOfAyahs} آية</div>
      </div>
    </button>
  );
}

function PlayerBar({ reciter, surah, surahs, onChange, onClose }: {
  reciter: Reciter; surah: Surah; surahs: Surah[]; onChange: (s: Surah) => void; onClose: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const url = fullSurahUrl(reciter, surah.number);

  useEffect(() => {
    if (!url) {
      toast.error("هذا الشيخ غير متوفر حالياً للسور الكاملة");
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    const a = new Audio(url);
    a.preload = "auto";
    audioRef.current = a;
    setLoading(true);
    setTime(0); setDuration(0);

    a.onloadedmetadata = () => { setDuration(a.duration); setLoading(false); };
    a.ontimeupdate = () => setTime(a.currentTime);
    a.onended = () => {
      const idx = surahs.findIndex(s => s.number === surah.number);
      if (idx >= 0 && idx + 1 < surahs.length) onChange(surahs[idx + 1]);
      else setPlaying(false);
    };
    a.onerror = () => { setLoading(false); toast.error("تعذر تحميل الصوت"); };

    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));

    return () => { a.pause(); a.src = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah.number, reciter.id]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else audioRef.current.play().then(() => setPlaying(true));
  };

  const seek = (v: number) => {
    if (audioRef.current) audioRef.current.currentTime = v;
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60); const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, "0")}`;
  };

  const idx = surahs.findIndex(s => s.number === surah.number);
  const prev = idx > 0 ? surahs[idx - 1] : null;
  const next = idx + 1 < surahs.length ? surahs[idx + 1] : null;

  const downloadRaw = async () => {
    if (!url) return;
    toast.info("جاري التحميل…");
    try {
      const r = await fetch(url);
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${reciter.name} - ${surah.name}.mp3`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("تم التحميل");
    } catch { toast.error("فشل التحميل"); }
  };

  return (
    <div className="sticky top-20 z-40 anim-fade-down mb-4">
      <div className="glass rounded-2xl p-3 sm:p-4 flex flex-col gap-2 border border-primary/30 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" onClick={() => prev && onChange(prev)} disabled={!prev}><SkipForward className="w-4 h-4" /></Button>
            <Button size="icon" onClick={toggle} disabled={loading} className="btn-gold rounded-full w-12 h-12">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => next && onChange(next)} disabled={!next}><SkipBack className="w-4 h-4" /></Button>
            <div className="flex-1 min-w-0 text-right">
              <div className="font-bold quran-text truncate" style={{ fontSize: "1.2rem", lineHeight: 1.2 }}>{surah.name}</div>
              <div className="text-xs text-muted-foreground truncate">{reciter.name}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={downloadRaw}><Download className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" onClick={onClose}>✕</Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
            <span>{fmt(time)}</span>
            <input type="range" min={0} max={duration || 0} step={0.1} value={time}
              onChange={(e) => seek(Number(e.target.value))}
              className="flex-1 accent-[oklch(0.82_0.14_85)]" />
            <span>{fmt(duration)}</span>
          </div>
      </div>
    </div>
  );
}
