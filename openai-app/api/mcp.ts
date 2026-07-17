import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildServer } from "../src/mcp-server.js";

export const config = { runtime: "edge" };

/**
 * Safely read a header from either a Web Request (Edge) or Node.js IncomingMessage (Serverless).
 * Web Headers use .get(); Node.js headers are a plain object.
 */
function getHeader(headers: any, name: string): string | null {
  if (typeof headers.get === "function") {
    return headers.get(name) ?? null;
  }
  // Node.js IncomingMessage: headers is Record<string, string | string[] | undefined>
  const val = headers[name.toLowerCase()];
  if (Array.isArray(val)) return val[0] ?? null;
  return val ?? null;
}

function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

function resolveBaseUrl(req: Request): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const forwardedProto = firstHeaderValue(getHeader(req.headers, "x-forwarded-proto"));
  const forwardedHost = firstHeaderValue(getHeader(req.headers, "x-forwarded-host"));
  const hostHeader = firstHeaderValue(getHeader(req.headers, "host"));

  let url: URL | null = null;
  try {
    url = new URL(req.url);
  } catch {
    const host = forwardedHost ?? hostHeader;
    if (host) {
      const proto = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : "https";
      try {
        url = new URL(req.url, `${proto}://${host}`);
      } catch {
        // ignore and fall back to headers/defaults below
      }
    }
  }

  const proto =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : url?.protocol.replace(":", "") || "https";
  const host = forwardedHost ?? hostHeader ?? url?.host ?? "localhost";
  return `${proto}://${host}`;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, mcp-session-id, mcp-protocol-version",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const baseUrl = resolveBaseUrl(req);
  const server = buildServer(baseUrl);
  // 无状态模式：每次请求独立处理，适配 Vercel Serverless/Edge 的无常驻进程模型。
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  const res = await transport.handleRequest(req);

  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);

  return new Response(res.body, { status: res.status, headers });
}
