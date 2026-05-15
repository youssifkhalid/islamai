import { proxyAudioUrl } from "@/lib/quranAudio";

export type Timings = {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
};

export type PrayerKey = keyof Timings;

export const PRAYER_NAMES: Record<PrayerKey, string> = {
  Fajr: "الفجر",
  Sunrise: "الشروق",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

export const PRAYER_KEYS: PrayerKey[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
export const ADHAN_PRAYER_KEYS: PrayerKey[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

export const ADHAN_VOICES = [
  { id: "makkah", name: "أذان مكة", url: "https://www.islamcan.com/audio/adhan/azan1.mp3" },
  { id: "madinah", name: "أذان المدينة", url: "https://www.islamcan.com/audio/adhan/azan2.mp3" },
  { id: "egypt", name: "أذان مصر", url: "https://www.islamcan.com/audio/adhan/azan3.mp3" },
  { id: "fajr", name: "أذان الفجر", url: "https://www.islamcan.com/audio/adhan/azan4.mp3" },
  { id: "hijaz", name: "أذان حجازي خاشع", url: "https://www.islamcan.com/audio/adhan/azan5.mp3" },
  { id: "haram", name: "أذان الحرم", url: "https://www.islamcan.com/audio/adhan/azan6.mp3" },
  { id: "sham", name: "أذان شامي", url: "https://www.islamcan.com/audio/adhan/azan7.mp3" },
  { id: "turkey", name: "أذان تركي", url: "https://www.islamcan.com/audio/adhan/azan8.mp3" },
  { id: "quds", name: "أذان القدس", url: "https://www.islamcan.com/audio/adhan/azan9.mp3" },
  { id: "maghrib", name: "أذان مغربي", url: "https://www.islamcan.com/audio/adhan/azan10.mp3" },
  { id: "deep", name: "أذان رخيم", url: "https://www.islamcan.com/audio/adhan/azan11.mp3" },
  { id: "classic", name: "أذان كلاسيكي", url: "https://www.islamcan.com/audio/adhan/azan12.mp3" },
  { id: "soft", name: "تنبيه هادئ", url: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3" },
] as const;

export type AdhanVoiceId = (typeof ADHAN_VOICES)[number]["id"];

export type PrayerSettings = {
  enabled: Record<PrayerKey, boolean>;
  voices: Record<PrayerKey, AdhanVoiceId>;
  method: number;
  madhab: 0 | 1;
  reminders: number;
  volume: number;
};

export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = {
  enabled: { Fajr: true, Sunrise: false, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  voices: { Fajr: "fajr", Sunrise: "soft", Dhuhr: "makkah", Asr: "makkah", Maghrib: "madinah", Isha: "egypt" },
  method: 5,
  madhab: 0,
  reminders: 0,
  volume: 0.9,
};

export function loadPrayerSettings(): PrayerSettings {
  if (typeof window === "undefined") return DEFAULT_PRAYER_SETTINGS;
  try {
    const stored = JSON.parse(localStorage.getItem("prayer_settings") || "{}");
    const legacyVoice = typeof stored.voice === "string" ? stored.voice : undefined;
    return {
      ...DEFAULT_PRAYER_SETTINGS,
      ...stored,
      enabled: { ...DEFAULT_PRAYER_SETTINGS.enabled, ...(stored.enabled ?? {}) },
      voices: {
        ...DEFAULT_PRAYER_SETTINGS.voices,
        ...(legacyVoice ? Object.fromEntries(PRAYER_KEYS.map((key) => [key, legacyVoice])) : {}),
        ...(stored.voices ?? {}),
      },
      volume: typeof stored.volume === "number" ? stored.volume : DEFAULT_PRAYER_SETTINGS.volume,
    };
  } catch {
    return DEFAULT_PRAYER_SETTINGS;
  }
}

export function savePrayerSettings(settings: PrayerSettings) {
  if (typeof window !== "undefined") localStorage.setItem("prayer_settings", JSON.stringify(settings));
}

export function adhanVoiceUrl(id: string): string {
  const voice = ADHAN_VOICES.find((item) => item.id === id) ?? ADHAN_VOICES[0];
  return proxyAudioUrl(voice.url);
}
