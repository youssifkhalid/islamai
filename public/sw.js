const CACHE = "mushaf-v3";
const AUDIO_CACHE = "quran-audio-v2";
const ASSETS = ["/", "/read", "/ai", "/reciters", "/auth", "/prayer", "/hadith", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== AUDIO_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Cache-first for audio files (use no-cors so opaque responses can be cached & played)
  if (/cdn\.islamic\.network\/quran\/audio/.test(url.href) || /everyayah\.com/.test(url.href) || /\.mp3($|\?)/i.test(url.pathname)) {
    e.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req, { mode: "no-cors" });
          // opaque responses are still cacheable
          try { await cache.put(req, res.clone()); } catch {}
          return res;
        } catch (err) {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
