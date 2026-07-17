import { BASE_STYLE, bootstrapScript } from "./bootstrap.js";

export function buildShowsWidgetHtml(): string {
  return `<!doctype html>
<div id="root"><div class="empty">加载中…</div></div>
<style>
${BASE_STYLE}
.header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px; }
.header h2 { font-size: 15px; margin: 0; }
.header .count { font-size: 12px; color: var(--muted); }
.day-group { margin-bottom: 14px; }
.day-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  margin: 0 0 6px;
  letter-spacing: .02em;
}
.show-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.show-time {
  font-weight: 800;
  font-size: 16px;
  min-width: 52px;
  text-align: center;
}
.show-main { flex: 1; min-width: 0; }
.show-title { font-weight: 700; font-size: 13.5px; margin: 0 0 2px; }
.show-meta { font-size: 11.5px; color: var(--muted); margin: 0; }
.status-pill {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.status-onsale { background: rgba(34,197,94,0.15); color: #16a34a; }
.status-soldout { background: rgba(148,163,184,0.2); color: var(--muted); }
.actions { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
</style>
<script type="module">
${bootstrapScript()}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
  });
}

function groupByDate(shows) {
  var map = {};
  var order = [];
  shows.forEach(function (s) {
    if (!map[s.date]) { map[s.date] = []; order.push(s.date); }
    map[s.date].push(s);
  });
  return order.map(function (d) { return { date: d, items: map[d] }; });
}

function renderShow(s) {
  var soldOut = s.ticket_status === "售罄";
  var pillClass = soldOut ? "status-soldout" : "status-onsale";
  var ticketBtn = (!soldOut && s.ticket_url)
    ? '<a class="ticket-btn" href="' + esc(s.ticket_url) + '" target="_blank" rel="noopener">购票</a>'
    : '';
  return '' +
    '<div class="show-card">' +
      '<div class="show-time">' + esc(s.time) + '</div>' +
      '<div class="show-main">' +
        '<p class="show-title">' + esc(s.theme || s.title) + '</p>' +
        '<p class="show-meta">' + esc(s.group) + ' · ' + esc(s.team) + ' · ' + esc(s.venue) + (s.special ? ' · ' + esc(s.special) : '') + '</p>' +
      '</div>' +
      '<div class="actions">' +
        '<span class="status-pill ' + pillClass + '">' + esc(s.ticket_status) + '</span>' +
        ticketBtn +
      '</div>' +
    '</div>';
}

function render(data) {
  var root = document.getElementById("root");
  var shows = data.shows || [];
  if (!shows.length) {
    root.innerHTML = '<div class="empty">未来 ' + esc(data.days || 7) + ' 天内暂无 ' + esc(data.group || "") + ' 公演安排</div>';
    return;
  }
  var header = '<div class="header"><h2>' + esc(data.group || "") + ' 近期公演</h2><span class="count">未来 ' + esc(data.days || 7) + ' 天 · 共 ' + shows.length + ' 场</span></div>';
  var groups = groupByDate(shows);
  var body = groups.map(function (g) {
    return '<div class="day-group"><p class="day-label">' + esc(g.date) + '</p>' + g.items.map(renderShow).join("") + '</div>';
  }).join("");
  root.innerHTML = header + body;
}
window.__snh48Render = render;
</script>`;
}
