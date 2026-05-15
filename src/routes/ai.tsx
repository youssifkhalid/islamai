import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Send, Loader2, ExternalLink, BookMarked,
  History, Plus, ArrowRight, Play, BookOpen,
  Search as SearchIcon, Compass, Mic, MicOff, Copy,
  Check, Trash2, ChevronDown, ChevronUp, Star,
  RotateCcw, Download, Bot, User as UserIcon,
  Hash, ThumbsUp, ThumbsDown, MessageSquare,
  Volume2, VolumeX, X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ai")({
  component: AIPage,
  head: () => ({
    meta: [
      { title: "إسلامي AI — المساعد الإسلامي الذكي" },
      { name: "description", content: "مساعد إسلامي ذكي بمصادر موثقة من القرآن والسنة." },
    ],
  }),
});

/* ─── Types ─── */
type Source = { title: string; url: string; quote?: string };
type Action =
  | { type: "play_surah"; surah: number; reciter?: string }
  | { type: "open_surah"; surah: number }
  | { type: "navigate"; to: string }
  | { type: "search_quran"; query: string }
  | { type: "open_hadith_book"; book: string };
type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  action?: Action | null;
  liked?: boolean | null;
  timestamp: number;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: { 0: { transcript: string } }[] }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const uid = () => Math.random().toString(36).slice(2);
const fmt = (ts: number) =>
  new Date(ts).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

const SUGGESTIONS = [
  { text: "شغّل سورة البقرة بصوت العفاسي", icon: Play, cat: "قرآن" },
  { text: "افتح مواقيت الصلاة", icon: Compass, cat: "صلاة" },
  { text: "ابحث عن آية الكرسي", icon: SearchIcon, cat: "بحث" },
  { text: "افتح صحيح البخاري", icon: BookOpen, cat: "حديث" },
  { text: "ما حكم صلاة الجماعة؟", icon: Sparkles, cat: "فقه" },
  { text: "كيف أؤدي صلاة الاستخارة؟", icon: Sparkles, cat: "فقه" },
  { text: "ما فضل قراءة سورة الكهف يوم الجمعة؟", icon: Star, cat: "فضائل" },
  { text: "ما أركان الإسلام الخمسة؟", icon: Hash, cat: "عقيدة" },
];

/* ─── Typing dots ─── */
const TypingDots = () => (
  <div className="flex items-center gap-1.5 py-0.5">
    {[0, 1, 2].map((i) => (
      <span key={i} className="w-2 h-2 rounded-full bg-primary block"
        style={{ animation: `aidot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
    ))}
  </div>
);

/* ─── Waveform ─── */
const Waveform = ({ active }: { active: boolean }) => (
  <div className="flex items-end gap-0.5 h-4">
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className="w-0.5 rounded-full bg-primary block"
        style={{
          height: active ? "8px" : "3px",
          animation: active ? `aiwave 0.9s ease-in-out ${n * 0.1}s infinite` : "none",
          transition: "height 0.2s",
        }} />
    ))}
  </div>
);

/* ─── Source Chip ─── */
const SourceChip = memo(({ s }: { s: Source }) => {
  const [showQ, setShowQ] = useState(false);
  return (
    <div className="relative">
      <a href={s.url} target="_blank" rel="noopener noreferrer"
        onMouseEnter={() => s.quote && setShowQ(true)}
        onMouseLeave={() => setShowQ(false)}
        className="ai-chip">
        <ExternalLink className="w-3 h-3 shrink-0" />
        <span className="truncate max-w-[140px]">{s.title}</span>
      </a>
      {showQ && s.quote && (
        <div className="absolute z-20 bottom-full mb-2 right-0 w-64 p-3 rounded-xl text-xs leading-relaxed shadow-2xl border border-primary/20 text-foreground/80 whitespace-normal"
          style={{ background: "oklch(0.15 0.022 260)", backdropFilter: "blur(16px)" }}>
          «{s.quote}»
        </div>
      )}
    </div>
  );
});
SourceChip.displayName = "SourceChip";

/* ─── Message Bubble ─── */
const MessageBubble = memo(({
  msg, onLike, onCopy, onRetry, onRunAction,
}: {
  msg: Msg;
  onLike: (id: string, v: boolean) => void;
  onCopy: (t: string) => void;
  onRetry?: () => void;
  onRunAction: (a: Action) => void;
}) => {
  const [showSrc, setShowSrc] = useState(false);
  const isUser = msg.role === "user";

  const actionLabels: Record<string, string> = {
    play_surah: "▶ تشغيل السورة",
    open_surah: "📖 فتح السورة",
    navigate: "↗ الانتقال",
    search_quran: "🔍 بحث في القرآن",
    open_hadith_book: "📚 فتح الكتاب",
  };

  /* Render markdown-lite */
  const html = msg.content
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, '<p class="ai-h3">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="ai-h2">$1</p>')
    .replace(/^[•\-] (.+)$/gm, '<p class="ai-li">$1</p>')
    .replace(/^(\d+)\. (.+)$/gm, '<p class="ai-oli">$2</p>');

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
      style={{ animation: `${isUser ? "aimsgu" : "aimsga"} 0.4s cubic-bezier(0.16,1,0.3,1) forwards` }}>

      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-sm ${
        isUser
          ? "text-primary-foreground"
          : "border border-primary/25 text-primary"
      }`} style={isUser ? { background: "var(--gradient-primary)" } : { background: "oklch(0.17 0.025 260)" }}>
        {isUser ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"} flex-1 min-w-0 max-w-[85%]`}>
        {/* Bubble */}
        <div className={`px-4 py-3 rounded-2xl ${isUser ? "ai-bubble-user" : "ai-bubble-ai"}`}>
          <div className="ai-prose text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: html }} />

          {/* Action button */}
          {msg.action && (
            <button onClick={() => onRunAction(msg.action!)}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)", boxShadow: "var(--shadow-gold)" }}>
              {actionLabels[msg.action.type] ?? "تنفيذ"}
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {/* Sources */}
          {msg.sources && msg.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-primary/15">
              <button onClick={() => setShowSrc(v => !v)}
                className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:opacity-80 transition-opacity">
                <BookMarked className="w-3.5 h-3.5" />
                المصادر ({msg.sources.length})
                {showSrc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showSrc && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {msg.sources.map((s, j) => <SourceChip key={j} s={s} />)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className={`flex items-center gap-1 ${isUser ? "flex-row-reverse" : ""}`}>
          <span className="text-[10px] text-muted-foreground/50 px-1">{fmt(msg.timestamp)}</span>
          <button onClick={() => onCopy(msg.content)} className="ai-tbtn" title="نسخ">
            <Copy className="w-3 h-3" />
          </button>
          {!isUser && (
            <>
              <button onClick={() => onLike(msg.id, true)}
                className={`ai-tbtn ${msg.liked === true ? "text-emerald-400" : ""}`} title="جيد">
                <ThumbsUp className="w-3 h-3" />
              </button>
              <button onClick={() => onLike(msg.id, false)}
                className={`ai-tbtn ${msg.liked === false ? "text-rose-400" : ""}`} title="سيء">
                <ThumbsDown className="w-3 h-3" />
              </button>
              {onRetry && (
                <button onClick={onRetry} className="ai-tbtn" title="إعادة المحاولة">
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
MessageBubble.displayName = "MessageBubble";

/* ─── Main Component ─── */
function AIPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; title: string }[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sound, setSound] = useState(true);
  const [searchHist, setSearchHist] = useState("");

  const endRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { textRef.current?.focus(); }, [convId]);

  useEffect(() => {
    if (!user) { setHistory([]); return; }
    supabase.from("conversations").select("id,title")
      .order("updated_at", { ascending: false }).limit(40)
      .then(({ data }) => setHistory(data ?? []));
  }, [user, convId, messages.length]);

  /* Auto-resize textarea */
  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = "auto";
      textRef.current.style.height = Math.min(textRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const chime = useCallback((freq = 660, dur = 0.1) => {
    if (!sound) return;
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = "sine";
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(); osc.stop(ctx.currentTime + dur);
    } catch {}
  }, [sound]);

  const toggleVoice = () => {
    const SR = (window as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition
      || (window as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;
    if (!SR) { toast.error("متصفحك لا يدعم التعرف على الصوت"); return; }
    if (isListening) { recRef.current?.stop(); setIsListening(false); return; }
    const rec = new SR();
    rec.lang = "ar-SA"; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e) => { setInput(p => p + e.results[0][0].transcript); setIsListening(false); };
    rec.onerror = () => { toast.error("تعذر التعرف على الصوت"); setIsListening(false); };
    rec.onend = () => setIsListening(false);
    recRef.current = rec; rec.start(); setIsListening(true);
  };

  const copyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); toast.success("تم النسخ");
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const handleLike = useCallback((id: string, v: boolean) => {
    setMessages(ms => ms.map(m => m.id === id ? { ...m, liked: m.liked === v ? null : v } : m));
  }, []);

  const loadConv = async (id: string) => {
    setConvId(id); setSidebarOpen(false);
    const { data } = await supabase.from("messages")
      .select("role,content,sources,created_at").eq("conversation_id", id).order("created_at");
    setMessages((data ?? []).map(m => ({
      id: uid(), role: m.role as "user" | "assistant",
      content: m.content, sources: (m.sources as Source[] | null) ?? undefined,
      timestamp: new Date(m.created_at).getTime(),
    })));
  };

  const newChat = () => { setConvId(null); setMessages([]); setSidebarOpen(false); textRef.current?.focus(); };

  const runAction = useCallback((action: Action) => {
    switch (action.type) {
      case "play_surah":
        navigate({ to: "/read", search: { surah: action.surah, play: 1, reciter: action.reciter, tab: "surahs" } });
        toast.success("جاري تشغيل السورة..."); break;
      case "open_surah":
        navigate({ to: "/read", search: { surah: action.surah, tab: "surahs" } }); break;
      case "navigate":
        navigate({ to: action.to as "/" }); break;
      case "search_quran":
        navigate({ to: "/read", search: { tab: "search" } });
        toast.info(`ابحث عن: ${action.query}`); break;
      case "open_hadith_book":
        navigate({ to: "/hadith" }); break;
    }
  }, [navigate]);

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    const userMsg: Msg = { id: uid(), role: "user", content: text, timestamp: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next); setInput(""); setLoading(true);
    chime(880, 0.08);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!res.ok) {
        const e: Record<number, string> = { 429: "تم تجاوز الحد، انتظر قليلاً", 402: "نفدت أرصدة AI", 500: "خطأ في الخادم" };
        toast.error(e[res.status] ?? "خطأ في الاتصال");
        setLoading(false); return;
      }
      const data = await res.json();
      const aiMsg: Msg = {
        id: uid(), role: "assistant",
        content: data.answer, sources: data.sources,
        action: data.action, timestamp: Date.now(),
      };
      setMessages(m => [...m, aiMsg]);
      chime(440, 0.15);
      // ⛔ DO NOT auto-execute actions — user must click the button explicitly

      if (user) {
        let id = convId;
        if (!id) {
          const { data: c } = await supabase.from("conversations")
            .insert({ user_id: user.id, title: text.slice(0, 60) }).select("id").single();
          id = c?.id ?? null; setConvId(id);
        }
        if (id) {
          await supabase.from("messages").insert([
            { conversation_id: id, user_id: user.id, role: "user", content: text },
            { conversation_id: id, user_id: user.id, role: "assistant", content: aiMsg.content, sources: aiMsg.sources ?? null },
          ]);
          await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", id);
        }
      }
    } catch { toast.error("فشل الاتصال"); }
    finally { setLoading(false); textRef.current?.focus(); }
  };

  const retryLast = () => {
    const last = [...messages].reverse().find(m => m.role === "user");
    if (!last) return;
    setMessages(ms => ms.slice(0, -1));
    send(last.content);
  };

  const deleteConv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("conversations").delete().eq("id", id);
    setHistory(h => h.filter(c => c.id !== id));
    if (convId === id) newChat();
    toast.success("تم حذف المحادثة");
  };

  const exportChat = () => {
    const text = messages.map(m => `${m.role === "user" ? "أنت" : "المساعد"}: ${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "islamaii-chat.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = history.filter(h => h.title.toLowerCase().includes(searchHist.toLowerCase()));

  return (
    <>
      <style>{`
        @keyframes aidot {
          0%,60%,100%{transform:translateY(0);opacity:.35}
          30%{transform:translateY(-9px);opacity:1}
        }
        @keyframes aiwave {
          0%,100%{height:3px} 50%{height:20px}
        }
        @keyframes aimsgu {
          from{opacity:0;transform:translateX(28px) scale(.95)}
          to{opacity:1;transform:none}
        }
        @keyframes aimsga {
          from{opacity:0;transform:translateX(-28px) scale(.95)}
          to{opacity:1;transform:none}
        }
        @keyframes aifloat {
          0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)}
        }
        @keyframes aiglow {
          0%,100%{box-shadow:0 0 20px oklch(0.82 0.14 85 / .18)}
          50%{box-shadow:0 0 60px oklch(0.82 0.14 85 / .55), 0 0 120px oklch(0.82 0.14 85 / .15)}
        }
        @keyframes aisuggest {
          from{opacity:0;transform:translateY(20px) scale(.97)}
          to{opacity:1;transform:none}
        }
        @keyframes aipulse {
          0%,100%{opacity:1} 50%{opacity:.4}
        }

        /* ── Page shell ── */
        .ai-shell {
          display:flex;
          height:calc(100vh - 72px);
          overflow:hidden;
          direction:rtl;
          position:relative;
        }

        /* ── Sidebar ── */
        .ai-sb {
          width:272px; flex-shrink:0;
          display:flex; flex-direction:column;
          background:linear-gradient(180deg,
            oklch(0.14 0.022 260 / .92) 0%,
            oklch(0.11 0.018 260 / .96) 100%);
          backdrop-filter:blur(32px) saturate(180%);
          border-left:1px solid oklch(0.82 0.14 85 / .12);
          transition:transform .4s cubic-bezier(.16,1,.3,1), width .4s;
          overflow:hidden;
          z-index:30;
        }
        .ai-sb--closed {
          transform:translateX(100%);
          position:absolute; right:0; top:0; bottom:0;
        }
        @media(min-width:1024px){
          .ai-sb--closed{ transform:none; position:relative; }
        }
        .ai-sb-top {
          padding:14px;
          border-bottom:1px solid oklch(0.82 0.14 85 / .1);
          display:flex; flex-direction:column; gap:8px;
        }
        .ai-sb-search {
          width:100%; background:oklch(0.18 0.02 260 / .7);
          border:1px solid oklch(0.82 0.14 85 / .15);
          border-radius:11px; padding:7px 12px;
          font-size:12px; color:oklch(0.96 0.01 90);
          outline:none; direction:rtl; transition:border-color .2s;
          font-family:inherit;
        }
        .ai-sb-search:focus{ border-color:oklch(0.82 0.14 85 / .45); }
        .ai-sb-search::placeholder{ color:oklch(0.45 0.01 90); }

        .ai-sb-list{ flex:1; overflow-y:auto; padding:8px; }
        .ai-sb-list::-webkit-scrollbar{ width:3px; }
        .ai-sb-list::-webkit-scrollbar-thumb{ background:oklch(0.82 0.14 85 / .18); border-radius:3px; }

        .ai-citem {
          display:flex; align-items:center; gap:7px;
          padding:8px 10px; border-radius:11px; cursor:pointer;
          transition:background .18s, color .18s; color:oklch(0.65 0.015 90);
          font-size:12.5px; margin-bottom:2px; direction:rtl;
        }
        .ai-citem:hover{ background:oklch(0.82 0.14 85 / .08); color:oklch(0.92 0.01 90); }
        .ai-citem--on{ background:oklch(0.82 0.14 85 / .15); color:oklch(0.82 0.14 85); }
        .ai-ctitle{ flex:1; text-align:right; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .ai-cdel{
          opacity:0; padding:3px; border-radius:6px;
          color:oklch(0.62 0.22 25); transition:opacity .18s; flex-shrink:0; cursor:pointer;
        }
        .ai-citem:hover .ai-cdel{ opacity:1; }
        .ai-cdel:hover{ background:oklch(0.62 0.22 25 / .15); }
        .ai-sb-foot {
          padding:10px 12px;
          border-top:1px solid oklch(0.82 0.14 85 / .1);
          display:flex; align-items:center; justify-content:space-between;
        }

        /* ── New chat btn ── */
        .ai-newbtn {
          display:flex; align-items:center; justify-content:center; gap:6px;
          padding:9px 14px; border-radius:13px; font-size:13px; font-weight:700;
          background:linear-gradient(135deg, oklch(0.82 0.14 85), oklch(0.65 0.16 50));
          color:oklch(0.13 0.02 260); border:none; cursor:pointer; width:100%;
          box-shadow:0 4px 18px oklch(0.82 0.14 85 / .32);
          transition:transform .2s, box-shadow .2s; font-family:inherit;
        }
        .ai-newbtn:hover{ transform:translateY(-1px); box-shadow:0 6px 26px oklch(0.82 0.14 85 / .48); }
        .ai-newbtn:active{ transform:scale(.97); }

        /* ── Main ── */
        .ai-main{ flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; }

        /* ── Top bar ── */
        .ai-topbar {
          padding:10px 18px;
          border-bottom:1px solid oklch(0.82 0.14 85 / .1);
          display:flex; align-items:center; justify-content:space-between;
          background:oklch(0.13 0.02 260 / .7); backdrop-filter:blur(24px);
          flex-shrink:0;
        }
        .ai-topbar-title {
          font-size:15px; font-weight:800;
          background:linear-gradient(135deg, oklch(0.82 0.14 85), oklch(0.65 0.16 50));
          -webkit-background-clip:text; background-clip:text; color:transparent;
        }
        .ai-ibtn {
          width:33px; height:33px; border-radius:10px; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          color:oklch(0.65 0.015 90); border:none; background:transparent;
          transition:background .18s, color .18s, transform .18s;
        }
        .ai-ibtn:hover{
          background:oklch(0.82 0.14 85 / .1); color:oklch(0.82 0.14 85); transform:scale(1.1);
        }

        /* ── Messages ── */
        .ai-msgs {
          flex:1; overflow-y:auto; padding:24px 20px 8px;
          display:flex; flex-direction:column; gap:18px;
          scroll-behavior:smooth;
        }
        .ai-msgs::-webkit-scrollbar{ width:4px; }
        .ai-msgs::-webkit-scrollbar-track{ background:transparent; }
        .ai-msgs::-webkit-scrollbar-thumb{ background:oklch(0.82 0.14 85 / .18); border-radius:4px; }

        /* ── Empty state ── */
        .ai-empty{
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; flex:1; text-align:center; padding:32px 24px;
        }
        .ai-orb{
          width:76px; height:76px; border-radius:22px;
          display:flex; align-items:center; justify-content:center;
          font-size:36px; margin-bottom:18px;
          background:linear-gradient(135deg, oklch(0.82 0.14 85), oklch(0.65 0.16 50));
          animation:aifloat 4s ease-in-out infinite, aiglow 3s ease-in-out infinite;
        }
        .ai-grid{
          display:grid; grid-template-columns:repeat(2,1fr); gap:9px;
          max-width:520px; width:100%; margin-top:24px;
        }
        @media(max-width:600px){ .ai-grid{ grid-template-columns:1fr; } }
        .ai-card{
          display:flex; align-items:flex-start; gap:9px;
          padding:11px 13px; border-radius:15px; text-align:right;
          background:linear-gradient(135deg,
            oklch(0.17 0.025 260 / .8),
            oklch(0.14 0.02 260 / .6));
          border:1px solid oklch(0.82 0.14 85 / .12);
          cursor:pointer; direction:rtl;
          transition:transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s, border-color .2s;
          opacity:0;
        }
        .ai-card.visible{
          animation:aisuggest .5s cubic-bezier(.16,1,.3,1) forwards;
        }
        .ai-card:hover{
          transform:translateY(-4px) scale(1.02);
          box-shadow:0 14px 36px oklch(0.82 0.14 85 / .18);
          border-color:oklch(0.82 0.14 85 / .38);
        }
        .ai-card-ico{
          width:28px; height:28px; border-radius:8px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          background:oklch(0.82 0.14 85 / .15); color:oklch(0.82 0.14 85);
        }
        .ai-card-cat{ font-size:10px; color:oklch(0.82 0.14 85); font-weight:700; margin-bottom:1px; }
        .ai-card-txt{ font-size:12px; color:oklch(0.7 0.015 90); line-height:1.5; }

        /* ── Bubbles ── */
        .ai-bubble-user{
          background:linear-gradient(135deg,
            oklch(0.82 0.14 85 / .18),
            oklch(0.65 0.16 50 / .14));
          border:1px solid oklch(0.82 0.14 85 / .25);
          border-radius:18px 4px 18px 18px;
          direction:rtl; text-align:right; word-break:break-word;
        }
        .ai-bubble-ai{
          background:linear-gradient(135deg,
            oklch(0.17 0.025 260 / .92),
            oklch(0.14 0.02 260 / .88));
          border:1px solid oklch(0.82 0.14 85 / .13);
          border-radius:4px 18px 18px 18px;
          backdrop-filter:blur(10px);
          direction:rtl; text-align:right; word-break:break-word;
        }

        /* ── Prose ── */
        .ai-prose{ font-size:13.5px; line-height:1.9; color:oklch(0.92 0.01 90); }
        .ai-prose strong{ color:oklch(0.88 0.12 85); font-weight:700; }
        .ai-h2{ font-size:14.5px; font-weight:800; color:oklch(0.82 0.14 85); margin:10px 0 4px; }
        .ai-h3{ font-size:13.5px; font-weight:700; color:oklch(0.72 0.1 85); margin:7px 0 3px; }
        .ai-li{ padding-right:14px; position:relative; margin:2px 0; }
        .ai-li::before{ content:"•"; position:absolute; right:0; color:oklch(0.82 0.14 85); }
        .ai-oli{ padding-right:18px; position:relative; margin:2px 0; }
        .ai-oli::before{ content:"◦"; position:absolute; right:0; color:oklch(0.55 0.13 160); }

        /* ── Source chip ── */
        .ai-chip{
          display:inline-flex; align-items:center; gap:4px;
          padding:3px 9px; border-radius:7px; font-size:11px; font-weight:500;
          background:oklch(0.82 0.14 85 / .1); border:1px solid oklch(0.82 0.14 85 / .2);
          color:oklch(0.82 0.14 85); cursor:pointer; text-decoration:none;
          transition:background .18s, border-color .18s;
        }
        .ai-chip:hover{ background:oklch(0.82 0.14 85 / .22); border-color:oklch(0.82 0.14 85 / .45); }

        /* ── Toolbar btn ── */
        .ai-tbtn{
          width:24px; height:24px; border-radius:7px;
          display:flex; align-items:center; justify-content:center;
          color:oklch(0.45 0.01 90); border:none; background:transparent; cursor:pointer;
          transition:background .15s, color .15s;
        }
        .ai-tbtn:hover{ background:oklch(0.82 0.14 85 / .1); color:oklch(0.82 0.14 85); }

        /* ── Loading bubble ── */
        .ai-thinking{
          background:linear-gradient(135deg,
            oklch(0.17 0.025 260 / .92), oklch(0.14 0.02 260 / .88));
          border:1px solid oklch(0.82 0.14 85 / .13);
          border-radius:4px 18px 18px 18px;
          padding:12px 16px; width:fit-content;
          backdrop-filter:blur(10px);
        }

        /* ── Input wrap ── */
        .ai-input-wrap{
          padding:12px 18px 16px;
          border-top:1px solid oklch(0.82 0.14 85 / .1);
          background:oklch(0.12 0.018 260 / .9);
          backdrop-filter:blur(24px);
          flex-shrink:0;
        }
        .ai-input-box{
          display:flex; align-items:flex-end; gap:8px;
          background:oklch(0.17 0.025 260 / .9);
          border:1.5px solid oklch(0.82 0.14 85 / .2);
          border-radius:18px; padding:9px 12px;
          transition:border-color .25s, box-shadow .25s;
        }
        .ai-input-box:focus-within{
          border-color:oklch(0.82 0.14 85 / .52);
          box-shadow:0 0 0 3px oklch(0.82 0.14 85 / .08),
                     0 8px 32px oklch(0.82 0.14 85 / .1);
        }
        .ai-ta{
          flex:1; background:transparent; border:none; outline:none; resize:none;
          font-family:inherit; font-size:13.5px; line-height:1.6;
          color:oklch(0.96 0.01 90); direction:rtl; text-align:right;
          min-height:22px; max-height:160px; overflow-y:auto;
        }
        .ai-ta::placeholder{ color:oklch(0.42 0.01 90); }
        .ai-ta::-webkit-scrollbar{ width:2px; }
        .ai-ta::-webkit-scrollbar-thumb{ background:oklch(0.82 0.14 85 / .2); }

        .ai-send{
          width:38px; height:38px; border-radius:12px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          background:linear-gradient(135deg, oklch(0.82 0.14 85), oklch(0.65 0.16 50));
          color:oklch(0.13 0.02 260); border:none; cursor:pointer;
          box-shadow:0 4px 16px oklch(0.82 0.14 85 / .38);
          transition:transform .2s, box-shadow .2s, opacity .2s;
        }
        .ai-send:hover:not(:disabled){ transform:scale(1.1); box-shadow:0 8px 28px oklch(0.82 0.14 85 / .55); }
        .ai-send:active:not(:disabled){ transform:scale(.94); }
        .ai-send:disabled{ opacity:.35; cursor:not-allowed; }

        .ai-mic{
          width:34px; height:34px; border-radius:10px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          color:oklch(0.65 0.015 90); border:none; background:transparent; cursor:pointer;
          transition:background .18s, color .18s;
        }
        .ai-mic:hover{ background:oklch(0.82 0.14 85 / .1); color:oklch(0.82 0.14 85); }
        .ai-mic--on{ color:oklch(0.62 0.22 25); animation:aipulse 1s ease-in-out infinite; }

        .ai-foot{
          display:flex; align-items:center; justify-content:space-between;
          margin-top:6px; padding:0 4px;
          font-size:11px; color:oklch(0.42 0.01 90);
        }
        .ai-charwarn{ color:oklch(0.62 0.22 25); }

        /* ── Typing label ── */
        .ai-status-badge{
          display:inline-flex; align-items:center; gap:5px;
          font-size:11px; color:oklch(0.55 0.13 160);
          animation:aipulse 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className="ai-shell">

        {/* ── SIDEBAR ── */}
        <aside className={`ai-sb ${sidebarOpen ? "" : "ai-sb--closed"}`}>
          <div className="ai-sb-top">
            <button className="ai-newbtn" onClick={newChat}>
              <Plus className="w-4 h-4" /> محادثة جديدة
            </button>
            <input className="ai-sb-search" placeholder="ابحث في السجل..."
              value={searchHist} onChange={e => setSearchHist(e.target.value)} />
          </div>

          <div className="ai-sb-list">
            {!user && (
              <Link to="/auth">
                <div className="text-center text-xs text-primary/70 hover:text-primary py-6 px-3 transition-colors cursor-pointer">
                  سجّل دخولك لحفظ المحادثات ←
                </div>
              </Link>
            )}
            {filtered.length === 0 && user && (
              <p className="text-xs text-muted-foreground/60 text-center py-6 px-3">لا توجد محادثات بعد</p>
            )}
            {filtered.map(h => (
              <div key={h.id} onClick={() => loadConv(h.id)}
                className={`ai-citem ${convId === h.id ? "ai-citem--on" : ""}`}>
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-40" />
                <span className="ai-ctitle">{h.title}</span>
                <button className="ai-cdel" onClick={e => deleteConv(h.id, e)} title="حذف">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="ai-sb-foot">
            <div className="flex gap-1.5">
              <button onClick={() => setSound(v => !v)} className="ai-ibtn" title={sound ? "كتم" : "تشغيل"}>
                {sound ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              {messages.length > 0 && (
                <button onClick={exportChat} className="ai-ibtn" title="تصدير المحادثة">
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground/40">
              {history.length} محادثة
            </span>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="ai-main">

          {/* Top bar */}
          <div className="ai-topbar">
            <div className="flex items-center gap-2.5">
              {user && (
                <button onClick={() => setSidebarOpen(v => !v)} className="ai-ibtn lg:hidden">
                  {sidebarOpen ? <X className="w-4 h-4" /> : <History className="w-4 h-4" />}
                </button>
              )}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: "var(--gradient-primary)", animation: "aifloat 5s ease-in-out infinite" }}>
                  ☪
                </div>
                <span className="ai-topbar-title">إسلامي AI</span>
                <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full border border-primary/25 text-primary/75"
                  style={{ background: "oklch(0.82 0.14 85 / .08)" }}>
                  مصادر موثقة
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {messages.length > 0 && (
                <>
                  <button onClick={() => copyText(messages.map(m => `${m.role === "user" ? "أنت" : "AI"}: ${m.content}`).join("\n\n---\n\n"))}
                    className="ai-ibtn" title="نسخ المحادثة">
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button onClick={exportChat} className="ai-ibtn" title="تصدير"><Download className="w-4 h-4" /></button>
                  <button onClick={newChat} className="ai-ibtn" title="جديد"><Plus className="w-4 h-4" /></button>
                </>
              )}
              {user && (
                <button onClick={() => setSidebarOpen(v => !v)} className="ai-ibtn hidden lg:flex" title="السجل">
                  <History className="w-4 h-4" />
                </button>
              )}
              <Link to="/">
                <button className="ai-ibtn" title="الرئيسية"><ArrowRight className="w-4 h-4" /></button>
              </Link>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-msgs">
            {messages.length === 0 && !loading ? (
              <div className="ai-empty">
                <div className="ai-orb">☪</div>
                <h2 className="text-xl font-black mb-1.5"
                  style={{ background: "linear-gradient(135deg, oklch(0.82 0.14 85), oklch(0.65 0.16 50))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                  السلام عليكم
                </h2>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                  اسألني عن الإسلام، أو اطلب مني تشغيل سورة، أو فتح صفحة
                </p>
                <div className="ai-grid">
                  {SUGGESTIONS.map((q, i) => {
                    const Icon = q.icon;
                    return (
                      <button key={i} onClick={() => send(q.text)} className="ai-card"
                        ref={el => { if (el) setTimeout(() => el.classList.add("visible"), i * 60); }}>
                        <div className="ai-card-ico"><Icon className="w-3.5 h-3.5" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="ai-card-cat">{q.cat}</div>
                          <div className="ai-card-txt">{q.text}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {!user && (
                  <p className="text-xs text-muted-foreground/60 mt-6">
                    <Link to="/auth" className="text-primary hover:underline font-medium">سجّل دخولك</Link> لحفظ المحادثات
                  </p>
                )}
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <MessageBubble key={msg.id} msg={msg}
                    onLike={handleLike} onCopy={copyText}
                    onRetry={msg.role === "assistant" && i === messages.length - 1 ? retryLast : undefined}
                    onRunAction={runAction}
                  />
                ))}

                {loading && (
                  <div className="flex gap-3 items-start"
                    style={{ animation: "aimsga .4s cubic-bezier(.16,1,.3,1) forwards" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-primary border border-primary/25 shrink-0"
                      style={{ background: "oklch(0.17 0.025 260)" }}>
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="ai-thinking">
                      <div className="flex items-center gap-3">
                        <TypingDots />
                        <div className="flex items-center gap-2">
                          <Waveform active />
                          <span className="text-xs text-muted-foreground/70">يبحث في المصادر...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="ai-input-wrap">
            <div className="ai-input-box">
              <button onClick={toggleVoice}
                className={`ai-mic ${isListening ? "ai-mic--on" : ""}`}
                title={isListening ? "إيقاف التسجيل" : "إدخال صوتي"}>
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <textarea ref={textRef} className="ai-ta"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={isListening ? "جاري الاستماع..." : "اسأل أو اطلب... (مثلاً: شغّل سورة الكهف، أو: ما حكم صيام الاثنين؟)"}
                rows={1} maxLength={2000} disabled={loading} />

              <button onClick={() => send()} className="ai-send"
                disabled={loading || !input.trim()} title="إرسال (Enter)">
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" style={{ transform: "rotate(180deg)" }} />}
              </button>
            </div>

            <div className="ai-foot">
              <span className="flex items-center gap-3">
                <span className="hidden sm:inline">Enter للإرسال · Shift+Enter لسطر جديد</span>
                {isListening && (
                  <span className="ai-status-badge">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 block" />
                    جاري التسجيل...
                  </span>
                )}
              </span>
              <span className={input.length > 1700 ? "ai-charwarn" : ""}>
                {input.length.toLocaleString("ar-EG")} / 2,000
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
