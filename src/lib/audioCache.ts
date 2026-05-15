const CACHE_NAME = "quran-audio-v3";

async function fetchCacheable(url: string): Promise<Response> {
  try {
    const res = await fetch(url);
    if (res.ok || res.type === "opaque") return res;
  } catch {}
  const res = await fetch(url, { mode: "no-cors" });
  if (!res.ok && res.type !== "opaque") throw new Error("فشل تحميل الملف الصوتي");
  return res;
}

export async function cacheSurahAudio(
  urls: string[],
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  if (!("caches" in window)) throw new Error("التخزين المؤقت غير مدعوم على هذا المتصفح");
  const cache = await caches.open(CACHE_NAME);
  let done = 0;
  const queue = [...urls];
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const url = queue.shift()!;
      try {
        const existing = await cache.match(url);
        if (!existing) {
          const res = await fetchCacheable(url);
          await cache.put(url, res.clone());
        }
      } catch {
        /* individual failures are non-fatal */
      }
      done++;
      onProgress?.(done, urls.length);
    }
  });
  await Promise.all(workers);
}

export async function isSurahCached(urls: string[]): Promise<boolean> {
  if (!("caches" in window) || urls.length === 0) return false;
  const cache = await caches.open(CACHE_NAME);
  const checks = await Promise.all(urls.slice(0, Math.min(5, urls.length)).map((u) => cache.match(u)));
  return checks.every(Boolean);
}

export async function getCacheUsageBytes(): Promise<number> {
  if (navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    return estimate.usage ?? 0;
  }
  return 0;
}

export async function clearAudioCache(): Promise<void> {
  if (!("caches" in window)) return;
  await caches.delete(CACHE_NAME);
}
