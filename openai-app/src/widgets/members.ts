import { BASE_STYLE, bootstrapScript } from "./bootstrap.js";

export function buildMembersWidgetHtml(): string {
  return `<!doctype html>
<div id="root"><div class="empty">加载中…</div></div>
<style>
${BASE_STYLE}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}
.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: transform .15s ease;
}
.card:hover { transform: translateY(-2px); }
.card .photo-wrap {
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: var(--border);
}
.card img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card .info { padding: 8px 10px 10px; }
.card .name { font-weight: 700; font-size: 14px; margin: 0 0 2px; }
.card .sub { font-size: 11px; color: var(--muted); margin: 0; }
.header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px; }
.header h2 { font-size: 15px; margin: 0; }
.header .count { font-size: 12px; color: var(--muted); }

.detail {
  display: flex;
  gap: 16px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
}
.detail .photo-wrap {
  width: 160px;
  min-width: 160px;
  aspect-ratio: 3 / 4;
  border-radius: 12px;
  overflow: hidden;
  background: var(--border);
}
.detail img { width: 100%; height: 100%; object-fit: cover; display: block; }
.detail .name { font-size: 20px; font-weight: 800; margin: 0 0 2px; }
.detail .pinyin { font-size: 12px; color: var(--muted); margin: 0 0 8px; }
.detail dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; font-size: 12.5px; margin: 8px 0; }
.detail dt { color: var(--muted); }
.detail dd { margin: 0; }
.detail .quote { margin-top: 10px; padding: 8px 10px; background: var(--bg); border-radius: 8px; font-style: italic; font-size: 12.5px; }
.back-link { font-size: 12px; color: var(--accent); cursor: pointer; margin-bottom: 8px; display: inline-block; }
</style>
<script type="module">
${bootstrapScript()}

var state = { members: [], query: "", total: 0, focusedSid: null };

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
  });
}

function badge(text, bg) {
  return '<span class="badge" style="background:#' + esc(bg || "8ed2f5") + '">' + esc(text) + '</span>';
}

function renderCard(m) {
  return '' +
    '<div class="card" data-sid="' + esc(m.sid) + '">' +
      '<div class="photo-wrap"><img src="' + esc(m.photo_url) + '" alt="' + esc(m.sname) + '" loading="lazy" /></div>' +
      '<div class="info">' +
        '<p class="name">' + esc(m.sname) + '</p>' +
        '<p class="sub">' + esc(m.gname) + ' · ' + esc(m.tname) + '</p>' +
      '</div>' +
    '</div>';
}

function renderDetail(m) {
  var expLines = (m.experience || "").split("\\n").filter(Boolean).map(esc).join("<br/>");
  return '' +
    (state.members.length > 1 ? '<span class="back-link" id="backLink">← 返回列表</span>' : '') +
    '<div class="detail">' +
      '<div class="photo-wrap"><img src="' + esc(m.photo_url) + '" alt="' + esc(m.sname) + '" /></div>' +
      '<div style="flex:1; min-width:0;">' +
        '<p class="name">' + esc(m.sname) + (m.nickname ? ' <span class="muted" style="font-size:13px;font-weight:400;">(' + esc(m.nickname) + ')</span>' : '') + '</p>' +
        '<p class="pinyin">' + esc(m.pinyin) + '</p>' +
        '<div>' + badge(m.gname, m.gcolor) + ' ' + badge(m.tname, m.tcolor) + '</div>' +
        '<dl>' +
          '<dt>期数</dt><dd>' + esc(m.pname) + '</dd>' +
          '<dt>生日</dt><dd>' + esc(m.birth_day) + (m.star_sign_12 ? '（' + esc(m.star_sign_12) + '）' : '') + '</dd>' +
          '<dt>身高</dt><dd>' + esc(m.height ? m.height + ' cm' : '—') + '</dd>' +
          '<dt>血型</dt><dd>' + esc(m.blood_type || '—') + '</dd>' +
          '<dt>籍贯</dt><dd>' + esc(m.birth_place || '—') + '</dd>' +
          '<dt>加入日期</dt><dd>' + esc(m.join_day || '—') + '</dd>' +
          (m.speciality ? '<dt>特长</dt><dd>' + esc(m.speciality) + '</dd>' : '') +
          (m.hobby ? '<dt>爱好</dt><dd>' + esc(m.hobby) + '</dd>' : '') +
          (m.ranking && m.ranking !== '0' ? '<dt>盛典排名</dt><dd>第 ' + esc(m.ranking) + ' 名</dd>' : '') +
        '</dl>' +
        (m.catch_phrase ? '<div class="quote">“' + esc(m.catch_phrase) + '”</div>' : '') +
        (expLines ? '<div class="quote" style="font-style:normal;">' + expLines + '</div>' : '') +
      '</div>' +
    '</div>';
}

function render(data) {
  state.members = data.members || [];
  state.query = data.query || "";
  state.total = data.total ?? state.members.length;
  state.focusedSid = state.members.length === 1 ? state.members[0].sid : null;
  paint();
}
window.__snh48Render = render;

function paint() {
  var root = document.getElementById("root");
  if (!state.members.length) {
    root.innerHTML = '<div class="empty">没有找到符合条件的成员</div>';
    return;
  }

  var focused = state.focusedSid
    ? state.members.find(function (m) { return m.sid === state.focusedSid; })
    : null;

  if (focused) {
    root.innerHTML = renderDetail(focused);
    var back = document.getElementById("backLink");
    if (back) back.addEventListener("click", function () {
      state.focusedSid = null;
      paint();
    });
    return;
  }

  var header = '<div class="header"><h2>成员查询结果</h2><span class="count">共 ' + state.total + ' 人' + (state.total > state.members.length ? '，显示前 ' + state.members.length + ' 位' : '') + '</span></div>';
  var grid = '<div class="grid">' + state.members.map(renderCard).join("") + '</div>';
  root.innerHTML = header + grid;

  Array.prototype.forEach.call(root.querySelectorAll(".card"), function (el) {
    el.addEventListener("click", function () {
      state.focusedSid = el.getAttribute("data-sid");
      paint();
      try { window.openai && window.openai.setWidgetState && window.openai.setWidgetState({ focusedSid: state.focusedSid }); } catch (e) {}
    });
  });
}
</script>`;
}
