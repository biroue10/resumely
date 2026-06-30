// Status page renderer. Fetches /status.json (which an external uptime monitor
// can keep updated — see docs/STATUS_MONITORING.md) and renders the overall
// banner, per-component states, and incident history. Degrades honestly if the
// file is missing or stale. External file (not inline) to keep CSP strict.
(function () {
  "use strict";
  var STATES = {
    operational: { label: "Operational", color: "#22c55e", bg: "#052e16", border: "#16a34a44", text: "#4ade80" },
    degraded:    { label: "Degraded performance", color: "#fbbf24", bg: "#3a2a08", border: "#d9770644", text: "#fbbf24" },
    partial:     { label: "Partial outage", color: "#fb923c", bg: "#3a1d08", border: "#ea580c44", text: "#fb923c" },
    major:       { label: "Major outage", color: "#ef4444", bg: "#3a0a0a", border: "#dc262644", text: "#f87171" },
    unknown:     { label: "Status unavailable", color: "#64748B", bg: "#0D1117", border: "#1A2740", text: "#94A3B8" },
  };
  var st = function (s) { return STATES[s] || STATES.unknown; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  function overallLabel(data) {
    if (!data || !data.components || !data.components.length) return "unknown";
    if (data.overall && STATES[data.overall]) return data.overall;
    var order = ["major", "partial", "degraded", "operational"];
    for (var i = 0; i < order.length; i++) {
      if (data.components.some(function (c) { return c.state === order[i]; })) return order[i];
    }
    return "operational";
  }

  function render(data) {
    var root = document.getElementById("status-root");
    if (!root) return;
    var ov = st(overallLabel(data));
    var when = data && data.updatedAt ? new Date(data.updatedAt) : null;
    var whenStr = when && !isNaN(when) ? when.toLocaleString() : "unknown";

    var html = "";
    // Overall banner
    html += '<div role="status" style="display:flex;align-items:center;gap:14px;padding:20px 24px;background:' + ov.bg + ';border:1px solid ' + ov.border + ';border-radius:12px;margin-bottom:14px">' +
      '<div style="width:14px;height:14px;border-radius:50%;background:' + ov.color + ';flex-shrink:0"></div>' +
      '<div><div style="font-size:16px;font-weight:700;color:' + ov.text + '">' + ov.label + '</div>' +
      '<div style="font-size:12px;color:#64748B;margin-top:2px">Last updated: ' + esc(whenStr) + '</div></div></div>';

    if (data && data.note) {
      html += '<p style="font-size:12.5px;color:#475569;margin:0 0 28px">' + esc(data.note) + '</p>';
    }

    // Legend
    html += '<div style="display:flex;flex-wrap:wrap;gap:14px;margin:0 0 28px">';
    ["operational", "degraded", "partial", "major"].forEach(function (k) {
      html += '<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#94A3B8"><span style="width:9px;height:9px;border-radius:50%;background:' + STATES[k].color + '"></span>' + STATES[k].label + '</span>';
    });
    html += '</div>';

    // Components grouped
    var groups = [];
    (data && data.components ? data.components : []).forEach(function (c) {
      var g = groups.filter(function (x) { return x.name === c.group; })[0];
      if (!g) { g = { name: c.group || "Components", items: [] }; groups.push(g); }
      g.items.push(c);
    });
    groups.forEach(function (g) {
      html += '<h2>' + esc(g.name) + '</h2>';
      g.items.forEach(function (c) {
        var s = st(c.state);
        var title = c.link ? '<a href="' + esc(c.link) + '" rel="noopener" style="color:#E4EBF5">' + esc(c.name) + ' ↗</a>' : esc(c.name);
        html += '<div class="status-row">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
          '<div style="width:10px;height:10px;border-radius:50%;background:' + s.color + ';flex-shrink:0"></div>' +
          '<div><div style="font-size:14px;font-weight:600;color:#E4EBF5">' + title + '</div>' +
          '<div style="font-size:12px;color:#475569">' + esc(c.desc || "") + '</div></div></div>' +
          '<span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;color:' + s.text + ';background:' + s.bg + ';border:1px solid ' + s.border + '">' + s.label + '</span>' +
          '</div>';
      });
    });

    // Incidents
    html += '<h2 style="margin-top:40px">Incident history</h2>';
    var incidents = (data && data.incidents) || [];
    if (!incidents.length) {
      html += '<p style="color:#475569;font-size:14px">No incidents recorded.</p>';
    } else {
      incidents.forEach(function (inc) {
        html += '<div style="border-left:2px solid #1A2740;padding-left:18px;margin-bottom:18px">' +
          '<div style="font-size:13px;font-weight:700;color:#E4EBF5">' + esc(inc.title || "Incident") + '</div>' +
          '<div style="font-size:12px;color:#475569;margin:2px 0 4px">' + esc(inc.date || "") + ' · ' + esc(st(inc.state).label) + '</div>' +
          '<div style="font-size:13px;color:#94A3B8;line-height:1.6">' + esc(inc.detail || "") + '</div></div>';
      });
    }
    root.innerHTML = html;
  }

  function init() {
    fetch("/status.json", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json(); })
      .then(render)
      .catch(function () { render(null); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
