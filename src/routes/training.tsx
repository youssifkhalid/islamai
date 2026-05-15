import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Mic, Square, Play, Loader2, GraduationCap, Trophy,
  CheckCircle2, XCircle, RefreshCw, BookOpen, Award, History, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { RECITERS } from "@/lib/reciters";
import { ayahAudioUrl } from "@/lib/quranAudio";
import { normalizeArabic } from "@/lib/search";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/training")({
  component: TrainingPage,
  head: () => ({
    meta: [
      { title: "تدريب وامتحان التلاوة — islamaii" },
      { name: "description", content: "درّب نفسك على تلاوة القرآن آية آية مع تصحيح فوري وحفظ سجل تقدّمك." },
    ],
  }),
});

type Surah = { number: number; name: string; englishName: string; numberOfAyahs: number };
type Ayah = { number: number; numberInSurah: number; text: string };
type AyahState = "idle" | "recording" | "correct" | "wrong";

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }>;
};
type SpeechRecognitionLike = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function tokenSimilarity(a: string, b: string): number {
  const A = normalizeArabic(a).split(/\s+/).filter(Boolean);
  const B = normalizeArabic(b).split(/\s+/).filter(Boolean);
  if (A.length === 0) return 0;
  const setB = new Set(B);
  let hits = 0;
  for (const w of A) if (setB.has(w)) hits++;
  return hits / A.length;
}

function TrainingPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"training" | "exam">("training");
  const [surah, setSurah] = useState<Surah | null>(null);
  const [fromAyah, setFromAyah] = useState(1);
  const [toAyah, setToAyah] = useState(1);
  const [reciterId, setReciterId] = useState(RECITERS[0].id);
  const [step, setStep] = useState<"pick" | "session" | "result">("pick");

  const [currentIdx, setCurrentIdx] = useState(0);
  const [states, setStates] = useState<AyahState[]>([]);
  const [heardPerAyah, setHeardPerAyah] = useState<string[]>([]);
  const [interim, setInterim] = useState("");
  const [recording, setRecording] = useState(false);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const matchTimerRef = useRef<number | null>(null);
  const autoStoppedRef = useRef<boolean>(false);

  const { data: surahs } = useQuery<Surah[]>({
    queryKey: ["surahs"],
    queryFn: async () => (await fetch("https://api.alquran.cloud/v1/surah").then(r => r.json())).data,
  });

  const { data: ayahs } = useQuery<Ayah[]>({
    queryKey: ["surah-text", surah?.number],
    queryFn: async () => {
      const r = await fetch(`https://api.alquran.cloud/v1/surah/${surah!.number}/quran-uthmani`);
      return (await r.json()).data.ayahs;
    },
    enabled: !!surah,
  });

  const selectedAyahs = useMemo(() => {
    if (!ayahs) return [];
    return ayahs.filter(a => a.numberInSurah >= fromAyah && a.numberInSurah <= toAyah);
  }, [ayahs, fromAyah, toAyah]);

  const startSession = () => {
    if (!surah) return;
    setStates(selectedAyahs.map(() => "idle"));
    setHeardPerAyah(selectedAyahs.map(() => ""));
    setCurrentIdx(0);
    setInterim("");
    setStep("session");
    // auto-start mic for the first ayah
    setTimeout(() => startRecording(0), 600);
  };

  // Speech recognition for one ayah at a time
  const startRecording = (idx: number) => {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!SR) { toast.error("متصفحك لا يدعم تحويل الصوت لنص. جرب Chrome."); return; }
    const rec = new SR();
    rec.lang = "ar-SA";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalText = "";

    rec.onresult = (e) => {
      let liveInterim = "";
      finalText = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        const alt = res[0];
        if (res.isFinal) finalText += alt.transcript + " ";
        else liveInterim += alt.transcript + " ";
      }
      const live = (finalText + liveInterim).trim();
      setInterim(live);

      // ── Auto-detect ayah completion ──
      // 1. Reset silence timer on any speech
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      // 2. If we got enough match → finalize early
      const expected = selectedAyahs[idx]?.text ?? "";
      const sim = tokenSimilarity(expected, live);
      const expectedWords = normalizeArabic(expected).split(/\s+/).filter(Boolean).length;
      const heardWords = normalizeArabic(live).split(/\s+/).filter(Boolean).length;
      // Auto-finalize if user said most of the ayah words AND reached high similarity
      if (sim >= 0.85 && heardWords >= Math.max(2, expectedWords - 1)) {
        if (matchTimerRef.current) window.clearTimeout(matchTimerRef.current);
        matchTimerRef.current = window.setTimeout(() => {
          if (!autoStoppedRef.current) { autoStoppedRef.current = true; try { rec.stop(); } catch {} }
        }, 350);
      }
      // 3. Silence detection — 2.2s of no new speech → finalize
      silenceTimerRef.current = window.setTimeout(() => {
        if (!autoStoppedRef.current && live.trim().length > 0) {
          autoStoppedRef.current = true; try { rec.stop(); } catch {}
        }
      }, 2200);
    };
    rec.onerror = (ev) => {
      if (ev.error !== "aborted" && ev.error !== "no-speech") {
        toast.error(`خطأ في الميكروفون: ${ev.error}`);
      }
    };
    rec.onend = () => {
      setRecording(false);
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      if (matchTimerRef.current) window.clearTimeout(matchTimerRef.current);
      finalizeAyah(idx, finalText.trim());
    };
    autoStoppedRef.current = false;
    try { rec.start(); } catch { /* already started */ }
    recRef.current = rec;
    setRecording(true);
    setInterim("");
    setStates(prev => prev.map((s, i) => i === idx ? "recording" : s));
  };

  const stopRecording = () => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
  };

  const finalizeAyah = (idx: number, heard: string) => {
    const expected = selectedAyahs[idx]?.text ?? "";
    const sim = tokenSimilarity(expected, heard);
    const passed = sim >= 0.7;
    const nextStates: AyahState[] = states.map((s, i) => i === idx ? (passed ? "correct" : "wrong") : s);
    const nextHeard = heardPerAyah.map((h, i) => i === idx ? heard : h);
    setHeardPerAyah(nextHeard);
    setStates(nextStates);

    if (mode === "training") {
      // auto-advance after a short delay
      setTimeout(() => {
        if (idx + 1 < selectedAyahs.length) {
          setCurrentIdx(idx + 1);
          setInterim("");
          // continue training loop automatically
          setTimeout(() => startRecording(idx + 1), 500);
        } else {
          finishSession(nextStates, nextHeard);
        }
      }, 1200);
    } else {
      // exam: advance immediately, no replay, auto-record next
      if (idx + 1 < selectedAyahs.length) {
        setCurrentIdx(idx + 1);
        setInterim("");
        setTimeout(() => startRecording(idx + 1), 600);
      } else {
        finishSession(nextStates, nextHeard);
      }
    }
  };

  const retryAyah = (idx: number) => {
    if (mode === "exam") return;
    setStates(prev => prev.map((s, i) => i === idx ? "idle" : s));
    setHeardPerAyah(prev => prev.map((h, i) => i === idx ? "" : h));
    setCurrentIdx(idx);
    setInterim("");
  };

  const playAyah = (idx: number) => {
    const reciter = RECITERS.find(r => r.id === reciterId) ?? RECITERS[0];
    const a = selectedAyahs[idx]; if (!a || !surah) return;
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = ayahAudioUrl(reciter, surah.number, a.numberInSurah);
    audioRef.current.play().catch(() => toast.error("تعذر التشغيل"));
  };

  const finishSession = async (finalStates: AyahState[] = states, finalHeard: string[] = heardPerAyah) => {
    setStep("result");
    if (!user || !surah) return;
    const correct = finalStates.filter(s => s === "correct").length;
    const total = selectedAyahs.length;
    const score = total ? Math.round((correct / total) * 100) : 0;
    const mistakes = selectedAyahs
      .map((a, i) => ({ ayah: a.numberInSurah, expected: a.text, heard: finalHeard[i] ?? "", state: finalStates[i] }))
      .filter(m => m.state === "wrong");

    try {
      await supabase.from("training_sessions").insert({
        user_id: user.id, mode, surah_number: surah.number, surah_name: surah.name,
        from_ayah: fromAyah, to_ayah: toAyah, reciter_id: reciterId,
        score, mistakes_count: mistakes.length, ayahs_total: total, ayahs_correct: correct,
        details: { mistakes },
      });
    } catch (e) { console.warn("save session failed", e); }
  };

  const reset = () => {
    setStep("pick"); setSurah(null); setFromAyah(1); setToAyah(1);
    setStates([]); setHeardPerAyah([]); setCurrentIdx(0); setInterim("");
  };

  const correctCount = states.filter(s => s === "correct").length;
  const wrongCount = states.filter(s => s === "wrong").length;
  const score = states.length ? Math.round((correctCount / states.length) * 100) : 0;

  return (
    <div className="container mx-auto px-4 pb-20 max-w-4xl">
      <div className="anim-fade-down text-center mb-6 mt-4">
        <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-2 flex items-center justify-center gap-3">
          <GraduationCap className="w-10 h-10" /> تدريب التلاوة
        </h1>
        <p className="text-muted-foreground">آية آية، تصحيح فوري بالألوان، وحفظ تقدّمك مع الوقت</p>
        {user && (
          <Link to="/training" className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
            <History className="w-3.5 h-3.5" /> سجل جلساتي محفوظ تلقائياً
          </Link>
        )}
      </div>

      {step === "pick" && (
        <div className="anim-fade-up glass rounded-3xl p-6 space-y-4">
          {/* Mode picker */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode("training")}
              className={`p-4 rounded-2xl border-2 transition-all text-right ${mode === "training" ? "border-primary bg-primary/10 scale-[1.02]" : "border-border hover:border-primary/40"}`}
            >
              <div className="flex items-center gap-2 mb-1 font-bold">
                <BookOpen className="w-5 h-5 text-primary" /> وضع التدريب
              </div>
              <p className="text-xs text-muted-foreground">يمكنك إعادة الآية، الاستماع للنطق الصحيح، والانتقال تلقائياً</p>
            </button>
            <button
              onClick={() => setMode("exam")}
              className={`p-4 rounded-2xl border-2 transition-all text-right ${mode === "exam" ? "border-amber-500 bg-amber-500/10 scale-[1.02]" : "border-border hover:border-amber-500/40"}`}
            >
              <div className="flex items-center gap-2 mb-1 font-bold">
                <Award className="w-5 h-5 text-amber-400" /> وضع الامتحان
              </div>
              <p className="text-xs text-muted-foreground">محاولة واحدة فقط لكل آية، بدون استماع، نتيجة نهائية</p>
            </button>
          </div>

          {!surahs ? <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /> : (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">السورة</label>
                <select
                  value={surah?.number ?? ""}
                  onChange={(e) => {
                    const s = surahs.find(x => x.number === Number(e.target.value));
                    if (s) { setSurah(s); setFromAyah(1); setToAyah(Math.min(3, s.numberOfAyahs)); }
                  }}
                  className="w-full glass border border-primary/20 rounded-xl p-3 bg-transparent"
                >
                  <option value="">— اختر —</option>
                  {surahs.map(s => <option key={s.number} value={s.number}>{s.number}. {s.name} ({s.numberOfAyahs} آية)</option>)}
                </select>
              </div>

              {surah && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">من آية</label>
                      <input type="number" min={1} max={surah.numberOfAyahs} value={fromAyah}
                        onChange={(e) => setFromAyah(Math.max(1, Math.min(surah.numberOfAyahs, Number(e.target.value))))}
                        className="w-full glass border border-primary/20 rounded-xl p-3 bg-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">إلى آية</label>
                      <input type="number" min={fromAyah} max={surah.numberOfAyahs} value={toAyah}
                        onChange={(e) => setToAyah(Math.max(fromAyah, Math.min(surah.numberOfAyahs, Number(e.target.value))))}
                        className="w-full glass border border-primary/20 rounded-xl p-3 bg-transparent" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">الشيخ (للاستماع)</label>
                    <select value={reciterId} onChange={(e) => setReciterId(e.target.value)}
                      className="w-full glass border border-primary/20 rounded-xl p-3 bg-transparent">
                      {RECITERS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                </>
              )}
              <Button onClick={startSession} disabled={!surah} className="btn-gold w-full h-12">
                ابدأ {mode === "exam" ? "الامتحان" : "التدريب"} <ArrowRight className="w-4 h-4 mr-2" />
              </Button>
              {!user && (
                <p className="text-xs text-muted-foreground text-center">
                  <Link to="/auth" className="text-primary hover:underline">سجّل الدخول</Link> لحفظ سجل تقدّمك.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {step === "session" && surah && (
        <div className="anim-fade-up space-y-4">
          {/* Header bar */}
          <div className="glass rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm">
              <span className="font-bold">{surah.name}</span>
              <span className="text-muted-foreground"> · آية {currentIdx + 1} من {selectedAyahs.length}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-4 h-4" /> {correctCount}</span>
              <span className="flex items-center gap-1 text-red-400"><XCircle className="w-4 h-4" /> {wrongCount}</span>
              <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold text-xs">{score}%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-card/40 overflow-hidden">
            <div className="h-full transition-all" style={{
              width: `${((currentIdx) / Math.max(1, selectedAyahs.length)) * 100}%`,
              background: "var(--gradient-primary)",
            }} />
          </div>

          {/* Mushaf-style ayah list */}
          <div className="glass rounded-3xl p-5 sm:p-7">
            <div className="quran-text text-right leading-loose text-2xl sm:text-3xl flex flex-wrap gap-y-2">
              {selectedAyahs.map((a, i) => {
                const s = states[i] ?? "idle";
                const isCurrent = i === currentIdx;
                // ⛔ EXAM MODE: hide text of un-attempted ayahs to prevent cheating
                const hideText = mode === "exam" && s === "idle";
                const cls = s === "correct"
                  ? "text-emerald-400"
                  : s === "wrong"
                  ? "text-red-400"
                  : s === "recording"
                  ? "text-primary animate-pulse"
                  : isCurrent ? "text-foreground/90" : "text-foreground/35";
                return (
                  <span
                    key={a.number}
                    onClick={() => mode === "training" && (s === "wrong" || s === "correct") && retryAyah(i)}
                    className={`transition-colors duration-500 ${cls} ${mode === "training" && (s === "wrong" || s === "correct") ? "cursor-pointer hover:underline" : ""} ${isCurrent ? "drop-shadow-[0_0_12px_var(--color-primary)]" : ""}`}
                  >
                    {" "}
                    {hideText
                      ? <span className="inline-block px-3 py-1 mx-1 rounded-lg bg-foreground/10 text-foreground/30 select-none" style={{ filter: "blur(6px)", letterSpacing: "0.3em" }}>••••• آية {a.numberInSurah} مخفية للامتحان •••••</span>
                      : a.text.replace(/^بِسْمِ.*?الرَّحِيمِ\s*/, "")}
                    <span className="ayah-num">{a.numberInSurah.toLocaleString("ar-EG")}</span>
                  </span>
                );
              })}
            </div>
            {mode === "exam" && (
              <p className="text-center text-xs text-amber-400/80 mt-3">🔒 الآيات مخفية في وضع الامتحان — اقرأ من حفظك</p>
            )}
          </div>

          {/* Live transcript */}
          <div className="glass rounded-2xl p-4 min-h-[80px] text-right">
            <div className="text-xs text-muted-foreground mb-1">ما تم التقاطه:</div>
            <div className="text-base">
              {interim || heardPerAyah[currentIdx] || <span className="text-muted-foreground">— صامت —</span>}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {mode === "training" && (
              <Button variant="outline" onClick={() => playAyah(currentIdx)} className="gap-2 border-primary/40">
                <Play className="w-4 h-4" /> اسمع النطق الصحيح
              </Button>
            )}
            <Button
              onClick={recording ? stopRecording : () => startRecording(currentIdx)}
              className={`h-16 w-16 rounded-full ${recording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "btn-gold"}`}
            >
              {recording ? <Square className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </Button>
            <Button variant="ghost" onClick={() => { stopRecording(); finishSession(); }}>
              إنهاء الجلسة
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            🎙️ التسجيل تلقائي — تكلّم مباشرة، التطبيق سيتعرّف على نهاية الآية وينتقل للتي بعدها وحده. {mode === "training" ? "اضغط على آية صحيحة/خاطئة لإعادتها." : "محاولة واحدة فقط في الامتحان."}
          </p>
        </div>
      )}

      {step === "result" && surah && (
        <div className="anim-scale glass rounded-3xl p-6 space-y-4">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-3 ${score >= 85 ? "bg-emerald-500/20" : score >= 60 ? "bg-amber-500/20" : "bg-red-500/20"}`}>
              <Trophy className={`w-12 h-12 ${score >= 85 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400"}`} />
            </div>
            <div className="text-5xl font-bold gradient-text">{score}%</div>
            <p className="text-muted-foreground mt-2">
              {correctCount} صحيحة · {wrongCount} تحتاج مراجعة · من أصل {selectedAyahs.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{mode === "exam" ? "وضع الامتحان" : "وضع التدريب"} · {surah.name} ({fromAyah}-{toAyah})</p>
          </div>

          {wrongCount > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-amber-300">آيات تحتاج مراجعة:</h3>
              {selectedAyahs.map((a, i) => states[i] === "wrong" && (
                <div key={a.number} className="p-4 rounded-xl bg-card/60 border border-red-500/20 text-right">
                  <div className="text-xs text-muted-foreground mb-1">آية {a.numberInSurah}</div>
                  <div className="quran-text text-lg text-emerald-400">{a.text}</div>
                  <div className="text-sm mt-2"><span className="text-red-400">قرأت:</span> {heardPerAyah[i] || "—"}</div>
                  <Button size="sm" variant="outline" onClick={() => playAyah(i)} className="mt-2 gap-2">
                    <Play className="w-3 h-3" /> اسمع الصحيح
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={reset} variant="ghost" className="flex-1">
              <RefreshCw className="w-4 h-4 ml-2" /> جلسة جديدة
            </Button>
            <Button onClick={() => { setStates(selectedAyahs.map(() => "idle")); setHeardPerAyah(selectedAyahs.map(() => "")); setCurrentIdx(0); setInterim(""); setStep("session"); }} className="btn-gold flex-1">
              أعد المحاولة
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
