import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Range, Accept, Origin",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type",
  "Access-Control-Max-Age": "86400",
};

const ALLOWED_HOSTS = new Set([
  "everyayah.com",
  "cdn.islamic.network",
  "www.islamcan.com",
  "islamcan.com",
  "download.quranicaudio.com",
  "server6.mp3quran.net",
  "server7.mp3quran.net",
  "server8.mp3quran.net",
  "server9.mp3quran.net",
  "server10.mp3quran.net",
  "server11.mp3quran.net",
  "server12.mp3quran.net",
  "server13.mp3quran.net",
  "server14.mp3quran.net",
  "server16.mp3quran.net",
]);

function isAllowed(host: string) {
  if (ALLOWED_HOSTS.has(host)) return true;
  // any *.mp3quran.net subdomain
  return /\.mp3quran\.net$/.test(host);
}

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

async function proxy(request: Request) {
  const requestUrl = new URL(request.url);
  const target = requestUrl.searchParams.get("url");
  if (!target) return jsonError("Missing url");

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return jsonError("Invalid url");
  }

  if (url.protocol !== "https:" || !isAllowed(url.hostname)) {
    return jsonError("Audio host is not allowed", 403);
  }

  try {
    const upstream = await fetch(url.toString(), {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: {
        "User-Agent": "islamaii-audio-proxy/1.0",
        Accept: request.headers.get("accept") || "audio/*,*/*;q=0.8",
        ...(request.headers.get("range") ? { Range: request.headers.get("range")! } : {}),
      },
    });

    if (!upstream.ok && upstream.status !== 206) {
      return jsonError(`Audio source unavailable (${upstream.status})`, upstream.status === 404 ? 404 : 502);
    }

    const headers = new Headers(CORS_HEADERS);
    headers.set("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
    for (const key of ["content-length", "content-range", "etag", "last-modified"]) {
      const value = upstream.headers.get(key);
      if (value) headers.set(key, value);
    }

    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (error) {
    console.error("audio proxy failed", error);
    return jsonError("Audio proxy failed", 502);
  }
}

export const Route = createFileRoute("/api/audio-proxy")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }: { request: Request }) => proxy(request),
      HEAD: async ({ request }: { request: Request }) => proxy(request),
    },
  },
});
