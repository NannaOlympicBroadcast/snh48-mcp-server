import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildServer } from "../src/mcp-server.js";

/**
 * Vercel 声明为 Edge Runtime，但在部分部署场景下可能回退到 Node.js Serverless，
 * 导致 handler 收到的 req 不是 Web Request 而是 Node.js IncomingMessage。
 * 此处保留声明，同时在 handler 内做兼容转换。
 */
export const runtime = "edge";

/* ------------------------------------------------------------------ */
/*  Node.js IncomingMessage → Web Request 转换                         */
/* ------------------------------------------------------------------ */

/**
 * 判断传入对象是否是真正的 Web Request（而非 Node.js IncomingMessage）。
 * Web Request 的 headers 是 Headers 对象，具有 .get() 方法。
 */
function isWebRequest(req: any): req is Request {
  return (
    typeof req?.headers?.get === "function" &&
    typeof req?.headers?.entries === "function"
  );
}

/**
 * 将 Node.js IncomingMessage（或 Vercel 包装的类似对象）转为 Web Request。
 * 在 Edge Runtime 下不会被调用——仅在 Node.js Serverless 回退时生效。
 */
async function toWebRequest(nodeReq: any): Promise<Request> {
  // 拼完整 URL
  const proto =
    nodeReq.headers?.["x-forwarded-proto"] ?? "https";
  const host =
    nodeReq.headers?.["x-forwarded-host"] ??
    nodeReq.headers?.host ??
    "localhost";
  const url = new URL(nodeReq.url ?? "/", `${proto}://${host}`);

  // 构造 Web Headers
  const headers = new Headers();
  const raw: Record<string, string | string[] | undefined> =
    nodeReq.headers ?? {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }

  // Body：GET / HEAD 不带 body
  const method: string = nodeReq.method ?? "GET";
  let body: ReadableStream | null = null;
  if (method !== "GET" && method !== "HEAD") {
    // nodeReq 可能是 Node.js Readable，也可能已被 Vercel 解析过（有 .body 属性）
    if (nodeReq.body !== undefined && nodeReq.body !== null) {
      if (nodeReq.body instanceof ReadableStream) {
        body = nodeReq.body;
      } else if (typeof nodeReq.body === "object" && typeof nodeReq.body.pipe !== "function") {
        // Vercel 可能已将 body 解析为 JSON 对象或 Buffer
        const raw = typeof globalThis.Buffer !== "undefined" && globalThis.Buffer.isBuffer(nodeReq.body)
          ? new Uint8Array(nodeReq.body)
          : new TextEncoder().encode(JSON.stringify(nodeReq.body));
        body = new ReadableStream({
          start(controller) {
            controller.enqueue(raw);
            controller.close();
          },
        });
      } else if (typeof nodeReq.body.pipe === "function") {
        // Node.js Readable stream → Web ReadableStream
        const { Readable } = await import("node:stream");
        body = Readable.toWeb(nodeReq.body) as ReadableStream;
      }
    } else if (typeof nodeReq.pipe === "function") {
      // nodeReq 本身是 Readable (IncomingMessage)
      const { Readable } = await import("node:stream");
      body = Readable.toWeb(nodeReq) as ReadableStream;
    }
  }

  return new Request(url.toString(), {
    method,
    headers,
    body,
    // @ts-expect-error — 'duplex' is required for streams but not yet in all TS types
    duplex: body ? "half" : undefined,
  });
}

/* ------------------------------------------------------------------ */
/*  resolveBaseUrl — 从请求推断当前部署域名                              */
/* ------------------------------------------------------------------ */

function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

function resolveBaseUrl(req: Request): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const forwardedProto = firstHeaderValue(req.headers.get("x-forwarded-proto"));
  const forwardedHost = firstHeaderValue(req.headers.get("x-forwarded-host"));
  const hostHeader = firstHeaderValue(req.headers.get("host"));

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

/* ------------------------------------------------------------------ */
/*  CORS                                                               */
/* ------------------------------------------------------------------ */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, mcp-session-id, mcp-protocol-version",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */

export default async function handler(incoming: any): Promise<Response> {
  // 兼容 Node.js Serverless：Vercel 在非 Edge 模式下传入 IncomingMessage
  const req: Request = isWebRequest(incoming) ? incoming : await toWebRequest(incoming);

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
