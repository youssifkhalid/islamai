import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Headphones, Pause, Play, BookOpen, Loader2, ChevronLeft, Download, Check } from "lucide-react";
import { toast } from "sonner";
import { cacheSurahAudio, isSurahCached } from "@/lib/audioCache";
import { RECITERS } from "@/lib/reciters";
import { ayahAudioUrl, surahAudioUrls } from "@/lib/quranAudio";

type ReadSearch = { surah?: number; play?: number; reciter?: string; tab?: string };

export const Route = createFileRoute("/read")({
  component: ReadPage,
  validateSearch: (s: Record<string, unknown>): ReadSearch => ({
    surah: s.surah ? Number(s.surah) : undefined,
    play: s.play ? Number(s.play) : undefined,
    reciter: typeof s.reciter === "string" ? s.reciter : undefined,
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
  head: () => ({
    meta: [
      { title: "قراءة القرآن الكريم — المصحف الشريف" },
      { name: "description", content: "تصفح كل سور القرآن، اقرأ الآيات بالرسم العثماني، استمع لأشهر القراء، وابحث في القرآن." },
    ],
  }),
});

type Surah = { number: number; name: string; englishName: string; numberOfAyahs: number; revelationType: string };
type Ayah = { number: number; numberInSurah: number; text: string; audio?: string };

function ReadPage() {
  const search = useSearch({ from: "/read" });
  const [selected, setSelected] = useState<number | null>(search.surah ?? null);
  const [reciter, setReciter] = useState(search.reciter ?? RECITERS[0].id);
  const [autoPlay, setAutoPlay] = useState(!!search.play);
  const [searchQ, setSearchQ] = useState("");
  const [tab, setTab] = useState(search.tab ?? "surahs");

  // React to URL changes (e.g. AI assistant intents)
  useEffect(() => {
    if (search.surah) setSelected(search.surah);
    if (search.reciter) setReciter(search.reciter);
    if (search.play) setAutoPlay(true);
    if (search.tab) setTab(search.tab);
  }, [search.surah, search.reciter, search.play, search.tab]);

  const { data: surahs, isLoading: loadingSurahs } = useQuery<Surah[]>({
    queryKey: ["surahs"],
    queryFn: async () => {
      const r = await fetch("https://api.alquran.cloud/v1/surah");
      const j = await r.json();
      return j.data;
    },
  });

  const filtered = useMemo(() => {
    if (!surahs) return [];
    if (!searchQ.trim()) return surahs;
    const q = searchQ.trim();
    return surahs.filter(
      (s) => s.name.includes(q) || s.englishName.toLowerCase().includes(q.toLowerCase()) || String(s.number) === q
    );
  }, [surahs, searchQ]);

  return (
    <div className="container mx-auto px-4 pb-20">
      <div className="anim-fade-down text-center mb-8 mt-4">
        <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-2">القراءة والاستماع</h1>
        <p className="text-muted-foreground">اختر سورة، استمع لأي قارئ، أو ابحث في القرآن كله</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="anim-fade-up">
        <TabsList className="grid grid-cols-2 max-w-md mx-auto mb-6 glass">
          <TabsTrigger value="surahs"><BookOpen className="w-4 h-4 ml-2" />السور</TabsTrigger>
          <TabsTrigger value="search"><Search className="w-4 h-4 ml-2" />بحث في القرآن</TabsTrigger>
        </TabsList>

        <TabsContent value="surahs">
          {selected === null ? (
            <>
              <div className="max-w-md mx-auto mb-6">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="ابحث عن سورة..."
                    className="pr-10 glass border-primary/20"
                  />
                </div>
              </div>
              {loadingSurahs ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map((s, i) => (
                    <button
                      key={s.number}
                      onClick={() => setSelected(s.number)}
                      className="anim-fade-up glass rounded-2xl p-4 flex items-center gap-3 hover:border-primary/60 hover:scale-[1.02] transition-all text-right group tilt"
                      style={{ animationDelay: `${Math.min(i, 20) * 0.02}s` }}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 group-hover:rotate-12 transition-transform"
                           style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
                        {s.number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-lg quran-text" style={{ fontSize: "1.4rem", lineHeight: 1.4 }}>{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.englishName} · {s.numberOfAyahs} آية · {s.revelationType === "Meccan" ? "مكية" : "مدنية"}
                        </div>
                      </div>
                      <ChevronLeft className="w-5 h-5 text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <SurahViewer
              surahNum={selected}
              reciter={reciter}
              setReciter={setReciter}
              autoPlay={autoPlay}
              clearAutoPlay={() => setAutoPlay(false)}
              onBack={() => setSelected(null)}
            />
          )}
        </TabsContent>

        <TabsContent value="search">
          <QuranSearch />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SurahViewer({ surahNum, reciter, setReciter, autoPlay, clearAutoPlay, onBack }: {
  surahNum: number; reciter: string; setReciter: (s: string) => void;
  autoPlay: boolean; clearAutoPlay: () => void; onBack: () => void;
}) {
  const [showReciters, setShowReciters] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentAyahIdx, setCurrentAyahIdx] = useState(0);
  const [cached, setCached] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data, isLoading } = useQuery<{ ayahs: Ayah[]; name: string; englishName: string }>({
    queryKey: ["surah-text", surahNum],
    queryFn: async () => {
      const r = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`);
      const j = await r.json();
      return j.data;
    },
  });

  useEffect(() => {
    setPlaying(false);
    setCurrentAyahIdx(0);
    if (audioRef.current) audioRef.current.pause();
  }, [surahNum, reciter]);

  useEffect(() => {
    if (!data) return;
    const selectedReciter = RECITERS.find((r) => r.id === reciter) ?? RECITERS[0];
    const urls = surahAudioUrls(selectedReciter, surahNum, data.ayahs.length);
    isSurahCached(urls).then(setCached);
  }, [data, reciter, surahNum]);

  const playAyah = (idx: number) => {
    if (!data) return;
    const ayah = data.ayahs[idx];
    const selectedReciter = RECITERS.find((r) => r.id === reciter) ?? RECITERS[0];
    if (!ayah) return;
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = ayahAudioUrl(selectedReciter, surahNum, ayah.numberInSurah);
    audioRef.current.onended = () => {
      if (idx + 1 < data.ayahs.length) {
        setCurrentAyahIdx(idx + 1);
        playAyah(idx + 1);
      } else {
        setPlaying(false);
      }
    };
    audioRef.current.play().then(() => setPlaying(true)).catch(() => toast.error("تعذر تشغيل الصوت"));
    setCurrentAyahIdx(idx);
  };

  // Auto-play when arriving via URL intent
  useEffect(() => {
    if (autoPlay && data && !playing) {
      playAyah(0);
      clearAutoPlay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, data]);

  const downloadSurah = async () => {
    if (!data) return;
    const selectedReciter = RECITERS.find((r) => r.id === reciter) ?? RECITERS[0];
    const urls = surahAudioUrls(selectedReciter, surahNum, data.ayahs.length);
    setProgress({ done: 0, total: urls.length });
    try {
      await cacheSurahAudio(urls, (done, total) => setProgress({ done, total }));
      setCached(true);
      toast.success("تم تحميل السورة للاستماع بدون إنترنت");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "فشل التحميل");
    } finally { setProgress(null); }
  };

  const togglePlay = () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      playAyah(currentAyahIdx);
    }
  };

  return (
    <div className="anim-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sticky top-20 z-20 glass rounded-2xl p-3">
        <Button variant="ghost" onClick={onBack} className="gap-2"><ChevronLeft className="w-4 h-4 rotate-180" />السور</Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowReciters((v) => !v)} variant="outline" className="gap-2 border-primary/40">
            <Headphones className="w-4 h-4" /><span className="hidden sm:inline">القارئ:</span> {RECITERS.find((r) => r.id === reciter)?.name}
          </Button>
          <Button onClick={downloadSurah} variant="outline" disabled={!data || !!progress} className="gap-2 border-primary/40">
            {progress ? <><Loader2 className="w-4 h-4 animate-spin" />{Math.round((progress.done/progress.total)*100)}%</>
              : cached ? <><Check className="w-4 h-4 text-emerald-400" /><span className="hidden sm:inline">محملة</span></>
              : <><Download className="w-4 h-4" /><span className="hidden sm:inline">تحميل</span></>}
          </Button>
          <Button onClick={togglePlay} className="btn-gold gap-2" disabled={!data}>
            {playing ? <><Pause className="w-4 h-4" />إيقاف</> : <><Play className="w-4 h-4" />استماع</>}
          </Button>
        </div>
      </div>

      {showReciters && (
        <div className="anim-scale glass rounded-2xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {RECITERS.map((r) => (
            <button
              key={r.id}
              onClick={() => { setReciter(r.id); setShowReciters(false); }}
              className={`p-3 rounded-xl text-sm font-medium transition-all text-right ${
                reciter === r.id ? "bg-primary text-primary-foreground" : "hover:bg-primary/10 glass"
              }`}
            >
              <div className="font-bold">{r.name}</div>
              <div className="text-[10px] opacity-70">{r.country}</div>
            </button>
          ))}
        </div>
      )}

      <div className="glass rounded-3xl p-6 sm:p-10">
        {isLoading || !data ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="text-center mb-6 pb-6 border-b border-primary/20">
              <div className="quran-text text-4xl gradient-text mb-2">{data.name}</div>
              <div className="text-sm text-muted-foreground">{data.englishName}</div>
            </div>
            {surahNum !== 1 && surahNum !== 9 && (
              <div className="quran-text text-center mb-6 text-primary">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
            )}
            {/* Native page scroll — no fixed height container */}
            <p className="quran-text text-right leading-loose">
              {data.ayahs.map((ayah, idx) => (
                <span
                  key={ayah.number}
                  onClick={() => playAyah(idx)}
                  className={`cursor-pointer transition-colors rounded px-1 ${
                    idx === currentAyahIdx && playing ? "bg-primary/20" : "hover:bg-primary/10"
                  }`}
                >
                  {ayah.text.replace(/^بِسْمِ.*?الرَّحِيمِ\s*/, "")}
                  <span className="ayah-num">{ayah.numberInSurah.toLocaleString("ar-EG")}</span>
                </span>
              ))}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function QuranSearch() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["search", submitted],
    queryFn: async () => {
      const r = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(submitted)}/all/ar`);
      const j = await r.json();
      return j.data;
    },
    enabled: submitted.length > 1,
  });

  return (
    <div>
      <form
        onSubmit={(e) => { e.preventDefault(); setSubmitted(q.trim()); }}
        className="max-w-xl mx-auto mb-6 flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن آية أو كلمة في القرآن..."
            className="pr-10 glass border-primary/20 h-12 text-base"
          />
        </div>
        <Button type="submit" className="btn-gold h-12 px-6">بحث</Button>
      </form>

      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}

      {data?.matches && (
        <div className="space-y-3 max-w-3xl mx-auto">
          <div className="text-sm text-muted-foreground text-center mb-4">عدد النتائج: {data.count}</div>
          {data.matches.slice(0, 50).map((m: { surah: { name: string }; numberInSurah: number; text: string }, i: number) => (
            <div key={i} className="anim-fade-up glass rounded-2xl p-5" style={{ animationDelay: `${Math.min(i, 10) * 0.04}s` }}>
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="text-primary font-bold">{m.surah.name}</span>
                <span className="text-muted-foreground">آية {m.numberInSurah}</span>
              </div>
              <p className="quran-text text-right" style={{ fontSize: "1.4rem" }}>{m.text}</p>
            </div>
          ))}
        </div>
      )}

      {submitted && !isLoading && (!data?.matches || data.matches.length === 0) && (
        <div className="text-center text-muted-foreground py-10">لا توجد نتائج</div>
      )}
    </div>
  );
}
