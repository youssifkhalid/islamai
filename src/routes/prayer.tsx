import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MapPin, Compass, Volume2, VolumeX, Loader2, Calendar, Bell, Settings2, LocateFixed, RefreshCw, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  ADHAN_VOICES,
  DEFAULT_PRAYER_SETTINGS,
  PRAYER_KEYS,
  PRAYER_NAMES,
  adhanVoiceUrl,
  loadPrayerSettings,
  savePrayerSettings,
  type PrayerKey,
  type PrayerSettings,
  type Timings,
} from "@/lib/prayerSettings";

export const Route = createFileRoute("/prayer")({
  component: PrayerPage,
  head: () => ({
    meta: [
      { title: "مواقيت الصلاة والقبلة — islamaii" },
      { name: "description", content: "مواقيت صلاة دقيقة حسب موقعك مع تحديث المدينة والدولة واتجاه القبلة وأذان قابل للتخصيص." },
    ],
  }),
});

type Coords = { lat: number; lng: number; city?: string; country?: string; source?: string };

function PrayerPage() {
  const queryClient = useQueryClient();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(true);
  const [settings, setSettings] = useState<PrayerSettings>(DEFAULT_PRAYER_SETTINGS);
  const [openSettings, setOpenSettings] = useState(false);
  const [now, setNow] = useState(new Date());
  const playedRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const alarmRef = useRef<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [gyroOn, setGyroOn] = useState(false);
  const [gyroSupported, setGyroSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "DeviceOrientationEvent" in window) setGyroSupported(true);
  }, []);

  const enableGyro = async () => {
    try {
      type DOEStatic = { requestPermission?: () => Promise<"granted" | "denied"> };
      const DOE = (window as unknown as { DeviceOrientationEvent?: DOEStatic }).DeviceOrientationEvent;
      if (DOE?.requestPermission) {
        const p = await DOE.requestPermission();
        if (p !== "granted") { toast.error("لم يتم منح إذن الجيروسكوب"); return; }
      }
      const handler = (ev: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
        // iOS gives webkitCompassHeading directly (0 = north). Android gives alpha (rotation around z).
        let h: number | null = null;
        if (typeof ev.webkitCompassHeading === "number") h = ev.webkitCompassHeading;
        else if (typeof ev.alpha === "number") h = 360 - ev.alpha;
        if (h != null) setHeading(((h % 360) + 360) % 360);
      };
      window.addEventListener("deviceorientationabsolute", handler as EventListener, true);
      window.addEventListener("deviceorientation", handler as EventListener, true);
      setGyroOn(true);
      toast.success("تم تفعيل البوصلة الحيّة 📱");
    } catch {
      toast.error("تعذر تشغيل الجيروسكوب");
    }
  };

  useEffect(() => { setSettings(loadPrayerSettings()); }, []);
  useEffect(() => { savePrayerSettings(settings); }, [settings]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const updateLocation = async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("تحديد الموقع غير مدعوم في هذا المتصفح");
      setLocating(false);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const r = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
          const j = await r.json();
          setCoords({ lat, lng, city: j.city, country: j.country, source: j.source });
          toast.success(j.city || j.country ? "تم تحديث موقعك بدقة" : "تم تحديث الإحداثيات");
        } catch {
          setCoords({ lat, lng });
          toast.warning("تم تحديث الإحداثيات، وتعذر جلب اسم المدينة مؤقتاً");
        } finally {
          setLocating(false);
          queryClient.invalidateQueries({ queryKey: ["timings"] });
          queryClient.invalidateQueries({ queryKey: ["qibla"] });
        }
      },
      () => { toast.error("تعذر تحديد الموقع، فعّل إذن الموقع من المتصفح"); setLocating(false); },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 60_000 }
    );
  };

  useEffect(() => { updateLocation(); }, []);

  const dateStr = useMemo(() => {
    const d = now;
    return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
  }, [now]);

  const { data: timingsData, isFetching: fetchingTimings } = useQuery({
    queryKey: ["timings", coords?.lat, coords?.lng, dateStr, settings.method, settings.madhab],
    queryFn: async () => {
      const r = await fetch(`https://api.aladhan.com/v1/timings/${dateStr}?latitude=${coords!.lat}&longitude=${coords!.lng}&method=${settings.method}&school=${settings.madhab}`);
      if (!r.ok) throw new Error("فشل جلب مواقيت الصلاة");
      const j = await r.json();
      return j.data as { timings: Timings; date: { hijri: { date: string; weekday: { ar: string }; month: { ar: string }; year: string } } };
    },
    enabled: !!coords,
  });

  const { data: qibla } = useQuery({
    queryKey: ["qibla", coords?.lat, coords?.lng],
    queryFn: async () => {
      const r = await fetch(`https://api.aladhan.com/v1/qibla/${coords!.lat}/${coords!.lng}`);
      const j = await r.json();
      return j.data as { direction: number };
    },
    enabled: !!coords,
  });

  const playAdhan = async (prayer: PrayerKey) => {
    const url = adhanVoiceUrl(settings.voices[prayer]);
    audioRef.current?.pause();
    const audio = new Audio(url);
    audio.preload = "auto";
    audio.volume = settings.volume;
    audioRef.current = audio;
    await audio.play();
  };

  const markAndPlay = (prayer: PrayerKey) => {
    const key = `${dateStr}-${prayer}`;
    if (!settings.enabled[prayer] || playedRef.current.has(key)) return;
    playedRef.current.add(key);
    playAdhan(prayer).catch(() => toast.error("المتصفح منع التشغيل التلقائي؛ اضغط اختبار الصوت مرة واحدة لتفعيل الأذان"));
    toast.success(`حان الآن وقت صلاة ${PRAYER_NAMES[prayer]}`);
  };

  useEffect(() => {
    if (!timingsData) return;
    const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    for (const k of PRAYER_KEYS) {
      const t = timingsData.timings[k]?.slice(0, 5);
      if (t === hhmm && now.getSeconds() < 60) markAndPlay(k);
    }
  }, [now, timingsData, settings, dateStr]);

  useEffect(() => {
    if (!timingsData) return;
    if (alarmRef.current) window.clearTimeout(alarmRef.current);
    const base = new Date(); base.setSeconds(0, 0);
    const upcoming = PRAYER_KEYS.map((k) => {
      const [h, m] = timingsData.timings[k].slice(0, 5).split(":").map(Number);
      const at = new Date(base); at.setHours(h, m, 0, 0);
      return { k, at };
    }).filter(({ k, at }) => settings.enabled[k] && at.getTime() > Date.now()).sort((a, b) => a.at.getTime() - b.at.getTime())[0];
    if (upcoming) alarmRef.current = window.setTimeout(() => markAndPlay(upcoming.k), Math.max(0, upcoming.at.getTime() - Date.now()));
    return () => { if (alarmRef.current) window.clearTimeout(alarmRef.current); };
  }, [timingsData, settings, dateStr]);

  const nextPrayer = useMemo(() => {
    if (!timingsData) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const order: PrayerKey[] = ["Fajr","Dhuhr","Asr","Maghrib","Isha"];
    for (const k of order) {
      const [h, m] = timingsData.timings[k].slice(0,5).split(":").map(Number);
      const t = new Date(today); t.setHours(h, m, 0, 0);
      if (t > now) {
        const diff = t.getTime() - now.getTime();
        const hh = Math.floor(diff / 3_600_000);
        const mm = Math.floor((diff % 3_600_000) / 60_000);
        const ss = Math.floor((diff % 60_000) / 1000);
        return { key: k, name: PRAYER_NAMES[k], time: timingsData.timings[k].slice(0,5), countdown: `${hh}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}` };
      }
    }
    return { key: "Fajr" as PrayerKey, name: "الفجر (غداً)", time: timingsData.timings.Fajr.slice(0,5), countdown: "—" };
  }, [now, timingsData]);

  return (
    <div className="container mx-auto px-4 pb-20">
      <div className="anim-fade-down text-center mb-8 mt-4">
        <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-2">مواقيت الصلاة والقبلة</h1>
        <p className="text-muted-foreground flex items-center justify-center gap-2 flex-wrap">
          <MapPin className="w-4 h-4 text-primary" />
          {locating ? "جاري تحديد موقعك..." : coords ? `${coords.city || "موقعك الحالي"}${coords.country ? ` · ${coords.country}` : ""}` : "موقع غير محدد"}
        </p>
        <Button onClick={updateLocation} disabled={locating} variant="outline" className="mt-4 gap-2 border-primary/40">
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />} تحديث موقعي
        </Button>
      </div>

      {locating && !coords && <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}

      {coords && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="anim-fade-right glass rounded-3xl p-6 lg:col-span-2 relative overflow-hidden">
            <div className="aurora" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4 gap-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">الصلاة القادمة</div>
                  <div className="text-3xl sm:text-4xl font-bold gradient-text">{nextPrayer?.name ?? "—"}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["timings"] })} className="border-primary/40" disabled={fetchingTimings}><RefreshCw className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => setOpenSettings(v => !v)} className="gap-1 border-primary/40"><Settings2 className="w-4 h-4" /> إعدادات</Button>
                </div>
              </div>
              <div className="text-5xl sm:text-6xl font-mono font-bold text-primary tabular-nums" style={{ animation: "glow-pulse 2.5s ease-in-out infinite" }}>{nextPrayer?.countdown ?? "--:--"}</div>
              <div className="text-sm text-muted-foreground mt-2">عند {nextPrayer?.time ?? "--:--"}</div>
              {timingsData?.date?.hijri && <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="w-4 h-4 text-primary" />{timingsData.date.hijri.weekday.ar} {timingsData.date.hijri.date} {timingsData.date.hijri.month.ar} {timingsData.date.hijri.year} هـ</div>}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-6">
                {PRAYER_KEYS.map((k, i) => (
                  <div key={k} className="anim-scale glass rounded-2xl p-3 text-center" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="text-xs text-muted-foreground mb-1">{PRAYER_NAMES[k]}</div>
                    <div className="font-bold text-primary">{timingsData?.timings[k]?.slice(0,5) ?? "--"}</div>
                    <button onClick={() => setSettings(s => ({ ...s, enabled: { ...s.enabled, [k]: !s.enabled[k] } }))} className="mt-2 text-primary hover:scale-110 transition-transform" title={settings.enabled[k] ? "أذان مفعّل" : "أذان مكتوم"}>
                      {settings.enabled[k] ? <Volume2 className="w-4 h-4 mx-auto" /> : <VolumeX className="w-4 h-4 mx-auto opacity-40" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="anim-fade-left glass rounded-3xl p-6 flex flex-col items-center justify-center text-center">
            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2"><Compass className="w-4 h-4" /> اتجاه القبلة</div>
            {(() => {
              const qiblaDir = qibla?.direction ?? 0;
              // When gyro is active, rotate the whole compass dial in opposite direction of phone heading,
              // so the kaaba pointer always points to true qibla in the room.
              const dialRotation = gyroOn && heading != null ? -heading : 0;
              const pointerRotation = qiblaDir + dialRotation;
              return (
                <div className="relative w-52 h-52 my-4">
                  {/* Outer ring with N/E/S/W labels — rotates with phone */}
                  <div className="absolute inset-0 rounded-full border-4 border-primary/30 transition-transform duration-200" style={{ transform: `rotate(${dialRotation}deg)` }}>
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 text-xs text-primary font-bold">ش</span>
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">ج</span>
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">غ</span>
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ش</span>
                  </div>
                  <div className="absolute inset-3 rounded-full glass flex items-center justify-center overflow-hidden">
                    <div className="absolute w-1.5 h-24 rounded-full transition-transform duration-300 ease-out"
                      style={{ background: "var(--gradient-primary)", transform: `translateY(-30%) rotate(${pointerRotation}deg)`, transformOrigin: "center bottom", boxShadow: "var(--shadow-gold)" }} />
                    <div className="absolute text-3xl" style={{ transform: `translateY(-58px) rotate(${pointerRotation}deg)`, transition: "transform 0.3s ease-out" }}>🕋</div>
                    <div className="absolute w-3 h-3 rounded-full bg-primary" />
                  </div>
                </div>
              );
            })()}
            <div className="text-3xl font-bold gradient-text">{qibla ? `${qibla.direction.toFixed(1)}°` : "—"}</div>
            <div className="text-xs text-muted-foreground mt-1">عن الشمال من موقعك</div>
            {gyroSupported && !gyroOn && (
              <Button onClick={enableGyro} variant="outline" size="sm" className="mt-3 gap-2 border-primary/40">
                <Smartphone className="w-4 h-4" /> فعّل البوصلة الحيّة
              </Button>
            )}
            {gyroOn && (
              <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> الجيروسكوب نشط · اتجاه الجوال: {heading?.toFixed(0) ?? "—"}°
              </div>
            )}
            {!gyroSupported && (
              <div className="mt-2 text-[10px] text-muted-foreground/60">جهازك لا يدعم الجيروسكوب</div>
            )}
          </div>
        </div>
      )}

      {openSettings && (
        <div className="anim-scale glass rounded-3xl p-6 mt-6 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> إعدادات الأذان الدقيقة</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            {PRAYER_KEYS.map((key) => (
              <div key={key} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="font-bold">{PRAYER_NAMES[key]}</span>
                  <button onClick={() => setSettings(s => ({ ...s, enabled: { ...s.enabled, [key]: !s.enabled[key] } }))} className="text-primary">{settings.enabled[key] ? <Volume2 /> : <VolumeX />}</button>
                </div>
                <select value={settings.voices[key]} onChange={(e) => setSettings(s => ({ ...s, voices: { ...s.voices, [key]: e.target.value as PrayerSettings["voices"][PrayerKey] } }))} className="w-full glass rounded-xl p-2 bg-card text-foreground border border-primary/20 mb-2">
                  {ADHAN_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <Button type="button" variant="outline" size="sm" onClick={() => playAdhan(key).then(() => toast.success("تم تفعيل صوت الأذان لهذا المتصفح")).catch(() => toast.error("تعذر اختبار الصوت"))} className="w-full border-primary/30 gap-2"><Volume2 className="w-4 h-4" /> اختبار الصوت</Button>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <label className="text-sm font-semibold">طريقة الحساب<select value={settings.method} onChange={(e) => setSettings(s => ({ ...s, method: Number(e.target.value) }))} className="mt-2 w-full glass rounded-xl p-3 bg-card text-foreground border border-primary/20"><option value={5}>مصر</option><option value={4}>أم القرى</option><option value={3}>رابطة العالم الإسلامي</option><option value={2}>ISNA</option><option value={8}>دبي</option><option value={15}>المغرب</option><option value={9}>الكويت</option></select></label>
            <label className="text-sm font-semibold">المذهب للعصر<select value={settings.madhab} onChange={(e) => setSettings(s => ({ ...s, madhab: Number(e.target.value) as 0 | 1 }))} className="mt-2 w-full glass rounded-xl p-3 bg-card text-foreground border border-primary/20"><option value={0}>شافعي/مالكي/حنبلي</option><option value={1}>حنفي</option></select></label>
            <label className="text-sm font-semibold">مستوى الصوت<input type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={(e) => setSettings(s => ({ ...s, volume: Number(e.target.value) }))} className="mt-4 w-full" /></label>
          </div>
        </div>
      )}
    </div>
  );
}
