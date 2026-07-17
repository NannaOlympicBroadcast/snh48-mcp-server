import { officialPhotoSource, placeholderSvg } from "../src/lib/photo.js";

export const runtime = "edge";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const sid = url.searchParams.get("sid") ?? "";
  const name = url.searchParams.get("name") ?? "";
  const color = url.searchParams.get("color") ?? "8ed2f5";

  if (sid && /^[0-9]+$/.test(sid)) {
    try {
      const upstream = await fetch(officialPhotoSource(sid), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://www.snh48.com/",
        },
      });
      const contentType = upstream.headers.get("content-type") ?? "";
      if (upstream.ok && contentType.startsWith("image/")) {
        return new Response(upstream.body, {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
          },
        });
      }
    } catch {
      // 上游请求失败，回退占位图
    }
  }

  return new Response(placeholderSvg(name, color), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
