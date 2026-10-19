// Minimal, safe Markdown renderer. Everything is HTML-escaped first; only a
// fixed set of constructs is turned back into markup.

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(text) {
  // Code spans and links are set aside first so emphasis rules can't touch them.
  const held = [];
  const hold = (html) => {
    held.push(html);
    return `\u0000${held.length - 1}\u0000`;
  };
  let s = escapeHtml(text)
    .replace(/`([^`]+)`/g, (_, c) => hold(`<code>${c}</code>`))
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) =>
      hold(`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`),
    );
  s = s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^\w*])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, "$1<em>$2</em>")
    .replace(/\[(\d{1,2})\]/g, '<a class="cite" data-ref="$1" role="button" tabindex="0">$1</a>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => held[Number(i)]);
}

function renderTable(lines) {
  const rows = lines
    .filter((l) => !/^\s*\|?\s*:?-{2,}/.test(l))
    .map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim())));
  if (!rows.length) return "";
  const [head, ...rest] = rows;
  return `<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rest
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

function renderBlocks(text) {
  const lines = text.split("\n");
  const html = [];
  let para = [];
  let list = null; // { type: "ul" | "ol", items: [] }
  let table = [];

  const flushPara = () => {
    if (para.length) html.push(`<p>${para.map(inline).join("<br>")}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) html.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.type}>`);
    list = null;
  };
  const flushTable = () => {
    if (table.length) html.push(renderTable(table));
    table = [];
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushTable();
  };

  for (const line of lines) {
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushPara();
      flushList();
      table.push(line);
    } else if (heading) {
      flushAll();
      const level = heading[1].length < 3 ? 3 : 4;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (bullet || ordered) {
      flushPara();
      flushTable();
      const type = bullet ? "ul" : "ol";
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push((bullet || ordered)[1]);
    } else if (!line.trim()) {
      flushAll();
    } else if (list && /^\s{2,}\S/.test(line)) {
      list.items[list.items.length - 1] += " " + line.trim();
    } else {
      flushList();
      flushTable();
      para.push(line);
    }
  }
  flushAll();
  return html.join("");
}

export function renderMarkdown(md) {
  const out = [];
  const parts = md.split(/```([\w-]*)\n?([\s\S]*?)(?:```|$)/);
  for (let i = 0; i < parts.length; i += 3) {
    out.push(renderBlocks(parts[i]));
    if (i + 2 < parts.length) out.push(`<pre><code>${escapeHtml(parts[i + 2].replace(/\n$/, ""))}</code></pre>`);
  }
  return out.join("");
}
