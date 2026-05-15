import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

type GeoResult = { city?: string; country?: string; source?: string };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

async function fromBigDataCloud(lat: number, lng: number): Promise<GeoResult | null> {
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ar`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`bigdatacloud ${res.status}`);
  const data = await res.json() as Record<string, string>;
  return {
    city: data.city || data.locality || data.principalSubdivision,
    country: data.countryName,
    source: "bigdatacloud",
  };
}

async function fromNominatim(lat: number, lng: number): Promise<GeoResult | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar`,
    { headers: { Accept: "application/json", "User-Agent": "islamaii/1.0" } }
  );
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const data = await res.json() as { address?: Record<string, string> };
  const address = data.address ?? {};
  return {
    city: address.city || address.town || address.village || address.county || address.state,
    country: address.country,
    source: "nominatim",
  };
}

export const Route = createFileRoute("/api/geocode")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const lat = Number(url.searchParams.get("lat"));
        const lng = Number(url.searchParams.get("lng"));
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return json({ error: "Invalid coordinates" }, 400);

        for (const provider of [fromBigDataCloud, fromNominatim]) {
          try {
            const result = await provider(lat, lng);
            if (result?.city || result?.country) return json({ ...result, lat, lng });
          } catch (error) {
            console.warn("geocode provider failed", error);
          }
        }

        return json({ lat, lng, city: undefined, country: undefined, source: "coordinates" });
      },
    },
  },
});
