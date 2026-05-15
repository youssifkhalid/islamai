import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, BookOpenCheck, ChevronLeft, ExternalLink, Shuffle, Hash, ListOrdered } from "lucide-react";

export const Route = createFileRoute("/hadith")({
  component: HadithPage,
  head: () => ({
    meta: [
      { title: "الحديث الشريف — صحيح البخاري ومسلم" },
      { name: "description", content: "تصفح كتب الحديث الشريف وابحث في صحيح البخاري ومسلم وسنن أبي داود والترمذي والنسائي وابن ماجه." },
    ],
  }),
});

const BOOKS = [
  { slug: "bukhari", name: "صحيح البخاري" },
  { slug: "muslim", name: "صحيح مسلم" },
  { slug: "abu-daud", name: "سنن أبي داود" },
  { slug: "tirmidzi", name: "سنن الترمذي" },
  { slug: "nasai", name: "سنن النسائي" },
  { slug: "ibnu-majah", name: "سنن ابن ماجه" },
  { slug: "ahmad", name: "مسند الإمام أحمد" },
  { slug: "darimi", name: "سنن الدارمي" },
  { slug: "malik", name: "موطأ مالك" },
];

type HadithItem = { number: number; arab: string; id?: string };

type Mode = "list" | "random" | "specific";

function HadithPage() {
  const [book, setBook] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode>("list");
  const [specificNum, setSpecificNum] = useState<number>(1);
  const PER = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["hadith", book, page, mode, specificNum],
    queryFn: async () => {
      let url: string;
      if (mode === "random") {
        url = `https://api.hadith.gading.dev/books/${book}/random`;
      } else if (mode === "specific") {
        url = `https://api.hadith.gading.dev/books/${book}/${specificNum}`;
      } else {
        url = `https://api.hadith.gading.dev/books/${book}?range=${(page-1)*PER+1}-${page*PER}`;
      }
      const r = await fetch(url);
      const j = await r.json();
      const d = j.data;
      // normalize: random/specific endpoints return a single hadith object
      if (d.hadiths) return d as { name: string; available: number; hadiths: HadithItem[] };
      return { name: d.name, available: d.available, hadiths: [d.hadith ?? d] } as { name: string; available: number; hadiths: HadithItem[] };
    },
    enabled: !!book,
  });

  const filtered = search.trim() && data
    ? data.hadiths.filter(h => h.arab.includes(search.trim()))
    : data?.hadiths;

  return (
    <div className="container mx-auto px-4 pb-20">
      <div className="anim-fade-down text-center mb-8 mt-4">
        <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-2">الحديث الشريف</h1>
        <p className="text-muted-foreground">كتب السنة المطهرة بين يديك</p>
      </div>

      {!book ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {BOOKS.map((b, i) => (
            <button
              key={b.slug}
              onClick={() => { setBook(b.slug); setPage(1); }}
              className="anim-fade-up glass rounded-2xl p-6 text-right tilt hover:border-primary/60 transition-all"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <BookOpenCheck className="w-8 h-8 text-primary mb-3" />
              <div className="font-bold text-xl">{b.name}</div>
              <div className="text-xs text-muted-foreground mt-1">انقر للتصفح</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="anim-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sticky top-20 z-20 glass rounded-2xl p-3">
            <Button variant="ghost" onClick={() => { setBook(null); setSearch(""); setMode("list"); }} className="gap-2">
              <ChevronLeft className="w-4 h-4 rotate-180" /> الكتب
            </Button>
            {/* Filter mode toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-card/40 border border-primary/15">
              <button onClick={() => setMode("list")} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${mode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <ListOrdered className="w-3.5 h-3.5" /> الكل
              </button>
              <button onClick={() => { setMode("random"); refetch(); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${mode === "random" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Shuffle className="w-3.5 h-3.5" /> عشوائي
              </button>
              <button onClick={() => setMode("specific")} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${mode === "specific" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Hash className="w-3.5 h-3.5" /> رقم
              </button>
            </div>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث في أحاديث هذا الكتاب..." className="pr-10 glass border-primary/20" />
            </div>
            {mode === "list" && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>السابق</Button>
                <span className="text-sm text-muted-foreground">صفحة {page}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>التالي</Button>
              </div>
            )}
            {mode === "random" && (
              <Button onClick={() => refetch()} size="sm" className="btn-gold gap-2"><Shuffle className="w-4 h-4" /> حديث آخر</Button>
            )}
            {mode === "specific" && (
              <div className="flex items-center gap-2">
                <Input type="number" min={1} max={data?.available ?? 999999} value={specificNum} onChange={(e) => setSpecificNum(Math.max(1, Number(e.target.value)))} className="w-28 glass border-primary/20" />
                <Button onClick={() => refetch()} size="sm" className="btn-gold">اعرض</Button>
              </div>
            )}
          </div>

          {isLoading && <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}

          {data && (
            <>
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold gradient-text">{data.name}</h2>
                <div className="text-xs text-muted-foreground">{data.available.toLocaleString("ar")} حديث متاح</div>
              </div>
              <div className="space-y-4 max-w-3xl mx-auto">
                {filtered?.map((h, i) => (
                  <article key={h.number} className="anim-fade-up glass rounded-2xl p-6" style={{ animationDelay: `${Math.min(i, 10) * 0.04}s` }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
                        حديث رقم {h.number}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">رواه: {data.name}</span>
                        <a href={`https://sunnah.com/${book}:${h.number}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                          sunnah.com <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <p className="quran-text text-right" style={{ fontSize: "1.3rem", lineHeight: 2 }}>{h.arab}</p>
                    <div className="mt-3 pt-3 border-t border-primary/10 text-xs text-muted-foreground/80">
                      📖 المصدر: <span className="text-primary">{data.name}</span> — حديث رقم {h.number}
                    </div>
                  </article>
                ))}
                {filtered?.length === 0 && <div className="text-center text-muted-foreground py-10">لا توجد نتائج في هذه الصفحة</div>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
