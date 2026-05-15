import type { Reciter } from "@/lib/reciters";

const TOTAL_QURAN_AYAHS = 6236;
const ESTIMATED_QURAN_SECONDS = 76 * 60 * 60;

export function padAyahPart(value: number): string {
  return String(value).padStart(3, "0");
}

export function rawAyahAudioUrl(reciter: Reciter, surah: number, ayah: number): string {
  const file = `${padAyahPart(surah)}${padAyahPart(ayah)}.mp3`;
  return `https://everyayah.com/data/${reciter.audioBase}/${file}`;
}

export function proxyAudioUrl(url: string): string {
  return `/api/audio-proxy?url=${encodeURIComponent(url)}`;
}

export function ayahAudioUrl(reciter: Reciter, surah: number, ayah: number): string {
  return proxyAudioUrl(rawAyahAudioUrl(reciter, surah, ayah));
}

export function rawFullSurahUrl(reciter: Reciter, surah: number): string | null {
  if (!reciter.surahServer) return null;
  return `${reciter.surahServer}${padAyahPart(surah)}.mp3`;
}

export function fullSurahUrl(reciter: Reciter, surah: number): string | null {
  const raw = rawFullSurahUrl(reciter, surah);
  return raw ? proxyAudioUrl(raw) : null;
}

export function surahAudioUrls(
  reciter: Reciter,
  surahNumber: number,
  ayahCount: number,
  proxied = true
): string[] {
  return Array.from({ length: ayahCount }, (_, i) => {
    const raw = rawAyahAudioUrl(reciter, surahNumber, i + 1);
    return proxied ? proxyAudioUrl(raw) : raw;
  });
}

export function estimateBytesForAyahs(ayahCount: number, bitrateKbps: number): number {
  const seconds = (ayahCount / TOTAL_QURAN_AYAHS) * ESTIMATED_QURAN_SECONDS;
  return Math.round((seconds * bitrateKbps * 1000) / 8);
}

export function estimateReciterBytes(reciter: Reciter): number {
  return estimateBytesForAyahs(TOTAL_QURAN_AYAHS, reciter.bitrateKbps);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}
