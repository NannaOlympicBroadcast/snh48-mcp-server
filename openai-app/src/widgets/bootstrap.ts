/**
 * 所有 widget 共用的宿主通信引导脚本。
 * 同时兼容两种数据注入方式：
 *  1) MCP Apps 标准：postMessage("ui/notifications/tool-result")
 *  2) 早期 ChatGPT Apps SDK 约定：window.openai.toolOutput / window.openai.widgetState
 */
export function bootstrapScript(): string {
  return `
    function extractData(payload) {
      if (!payload) return null;
      return payload.structuredContent ?? payload;
    }

    function deliver(data) {
      if (!data) return;
      try { window.__snh48Render && window.__snh48Render(data); } catch (e) { console.error(e); }
    }

    window.addEventListener("message", function (event) {
      if (event.source !== window.parent) return;
      var message = event.data;
      if (!message || message.jsonrpc !== "2.0") return;
      if (message.method !== "ui/notifications/tool-result") return;
      deliver(extractData(message.params));
    }, { passive: true });

    (function initFromHostGlobal() {
      var oai = window.openai;
      if (oai && oai.toolOutput) {
        deliver(extractData({ structuredContent: oai.toolOutput }));
      }
      window.addEventListener("openai:set_globals", function () {
        var o = window.openai;
        if (o && o.toolOutput) deliver(extractData({ structuredContent: o.toolOutput }));
      });
    })();
  `;
}

export const BASE_STYLE = `
  :root {
    color-scheme: light dark;
    --fg: #1b1b1f;
    --muted: #6b6b76;
    --bg: #ffffff;
    --card-bg: #f7f7fa;
    --border: rgba(0,0,0,0.08);
    --accent: #d63384;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --fg: #f2f2f5;
      --muted: #a3a3ad;
      --bg: #17171b;
      --card-bg: #202024;
      --border: rgba(255,255,255,0.08);
      --accent: #ff7ab8;
    }
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: transparent; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", Segoe UI, sans-serif;
    color: var(--fg);
    font-size: 14px;
  }
  #root { padding: 12px; }
  .muted { color: var(--muted); }
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    color: #1b1b1f;
  }
  a.ticket-btn {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 8px;
    background: var(--accent);
    color: white;
    text-decoration: none;
    font-weight: 600;
    font-size: 12px;
  }
  .empty {
    padding: 24px;
    text-align: center;
    color: var(--muted);
  }
`;
