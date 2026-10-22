/* RGC Neuroprotection Wheel: behaviour (filters, sorting, drawing, pop-ups).
   Colours, order, labels and sizes are in settings.js; texts are in page.html. */
const DATA = window.WHEEL_DATA;   // written by scripts/prep.py into data/data.js
const ROWS = DATA.rows, REFS = DATA.refs;

/* ---------------- dimensions (colours, order and labels live in settings.js) ---------------- */

const clsFamily = {}, clsGroup = {};
CLASSES.forEach(([g, cl]) => cl.forEach(([c, f]) => { clsFamily[c] = f; clsGroup[c] = g; }));
const modelCatOf = {};
ROWS.forEach(r => { modelCatOf[r.modelGroup] = r.modelCat; });
const countBy = (rows, k) => rows.reduce((m, r) => (m[r[k]] = (m[r[k]] || 0) + 1, m), {});
const allCountModel = countBy(ROWS, "modelGroup");
const MODEL_GROUPS = Object.keys(modelCatOf).sort((a, b) =>
  MODEL_CATS.indexOf(modelCatOf[a]) - MODEL_CATS.indexOf(modelCatOf[b]) || allCountModel[b] - allCountModel[a] || a.localeCompare(b));
const SPECIES = Object.entries(countBy(ROWS, "species")).sort((a, b) => b[1] - a[1]).map(e => e[0]);

const DIMS = {
  cls:        { label: "Drug class", short: "class", values: CLASSES.flatMap(([, cl]) => cl.map(c => c[0])), parent: v => clsGroup[v], color: v => FAMILY[clsFamily[v]] },
  modelCat:   { label: "Model category", short: "model category", values: MODEL_CATS, parent: null, color: v => MODEL_COL[v] },
  modelGroup: { label: "Injury model", short: "model", values: MODEL_GROUPS, parent: v => modelCatOf[v], color: v => MODEL_COL[modelCatOf[v]] },
  route:      { label: "Route", short: "route", values: ROUTES, parent: v => v === "Systemic" ? "Systemic" : v === "Combined" ? "Mixed" : "Local", color: v => ROUTE_FILL[v], name: v => ROUTE_NAME[v] },
  dosing:     { label: "Dosing & duration", short: "dosing", values: DOSING, parent: v => v === "Single dose" ? "Single" : v === "Not reported" ? "n.r." : "Repeated", color: v => DOSE_FILL[v] },
  species:    { label: "Species", short: "species", values: SPECIES, parent: null, color: v => SPECIES_FILL[v] || FAMILY.grey },
  outcome:    { label: "RGC outcome", short: "outcome", values: OUTCOMES, parent: v => (v === "No RGC readout" || v === "Not determined") ? "No RGC endpoint" : "RGC endpoint", color: v => OUT_FILL[v] },
};
const DIM_ORDER = ["cls", "modelCat", "modelGroup", "route", "dosing", "species", "outcome"];
const nameOf = (dim, v) => (DIMS[dim].name ? DIMS[dim].name(v) : v);

/* ---------------- state ---------------- */
const state = { arrange: "cls", filters: {}, q: "", sel: null, sort: "ref", open: { cls: true, modelCat: true, modelGroup: false, route: true, dosing: true, species: false, outcome: true } };
DIM_ORDER.forEach(d => state.filters[d] = new Set());
try { const s = JSON.parse(localStorage.getItem("rgcwheel") || "null"); if (s && DIMS[s.arrange]) { state.arrange = s.arrange; state.sort = s.sort || "ref"; } } catch (e) {}
function remember() { try { localStorage.setItem("rgcwheel", JSON.stringify({ arrange: state.arrange, sort: state.sort })); } catch (e) {} }

function matchesQ(r) {
  if (!state.q) return true;
  const q = state.q.toLowerCase(), ref = REFS[r.ref];
  return r.compound.toLowerCase().includes(q) || ref.short.toLowerCase().includes(q) || ref.authors.toLowerCase().includes(q) || String(r.ref) === q;
}
function filtered(except) {
  return ROWS.filter(r => matchesQ(r) && DIM_ORDER.every(d => d === except || state.filters[d].size === 0 || state.filters[d].has(r[d])));
}
const baseName = c => c.replace(/\s*\(.*\)/, "").trim().toLowerCase();
const nCompounds = rows => new Set(rows.map(r => baseName(r.compound))).size;
const nStudies = rows => new Set(rows.map(r => r.ref)).size;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

/* ---------------- facets column ---------------- */
const WHEEL_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="2.2" fill="currentColor"/><path d="M8 1.5v4M8 10.5v4M1.5 8h4M10.5 8h4" stroke="currentColor" stroke-width="1.4"/></svg>';
const CHEV = '<svg class="chev" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1.5 7 5 3 8.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
function renderFacets() {
  const host = document.getElementById("facets");
  host.innerHTML = DIM_ORDER.map(dim => {
    const D = DIMS[dim], pool = filtered(dim), counts = countBy(pool, dim), on = state.filters[dim];
    let lastP = null, html = "";
    D.values.forEach(v => {
      const p = D.parent ? D.parent(v) : null;
      if (p && p !== lastP && dim !== "route" && dim !== "outcome") { html += `<div class="vgroup">${esc(p)}</div>`; }
      lastP = p;
      const n = counts[v] || 0, checked = on.has(v), col = D.color(v);
      html += `<label class="val${n === 0 && !checked ? " zero" : ""}${checked ? " on" : ""}">
        <input type="checkbox" data-dim="${dim}" data-v="${esc(v)}"${checked ? " checked" : ""}${n === 0 && !checked ? " disabled" : ""}>
        <span class="sw" style="background:${col[0]};border-color:${col[1]}"></span>
        <span class="vl">${esc(nameOf(dim, v))}</span><span class="vc">${n}</span></label>`;
    });
    const act = on.size ? `<span class="facet-active">${on.size}</span>` : "";
    return `<details class="facet" data-dim="${dim}"${state.open[dim] ? " open" : ""}>
      <summary><span class="facet-name">${CHEV}${esc(D.label)} ${act}</span>
      <button class="arrange" type="button" data-arrange="${dim}" aria-pressed="${state.arrange === dim}" title="Arrange the wheel by ${esc(D.label.toLowerCase())}">${WHEEL_ICON}Wheel</button></summary>
      <div class="vals">${html}</div></details>`;
  }).join("");
}
document.getElementById("facets").addEventListener("change", e => {
  const t = e.target; if (!t.dataset.dim) return;
  const s = state.filters[t.dataset.dim];
  t.checked ? s.add(t.dataset.v) : s.delete(t.dataset.v);
  state.sel = null; render();
});
document.getElementById("facets").addEventListener("click", e => {
  const b = e.target.closest("[data-arrange]");
  if (b) { e.preventDefault(); setArrange(b.dataset.arrange); }
});
document.getElementById("facets").addEventListener("toggle", e => {
  const d = e.target.closest("details.facet"); if (d) state.open[d.dataset.dim] = d.open;
}, true);
function setArrange(dim) { state.arrange = dim; state.sel = null; remember(); render(); }

/* ---------------- wheel geometry ---------------- */
/* Three interconnected rings (inner → outer: model, route, drug class). Each experiment is one
   radial slice at the same angle in every ring and in the dosing rings, so the sector order
   chosen in the left panel turns the rings into a colour bar code. */
const rDur = d => R.dur[0] + (Math.log10(d) - Math.log10(DMIN)) / (Math.log10(DMAX) - Math.log10(DMIN)) * (R.dur[1] - R.dur[0]);
const pt = (r, a) => [r * Math.sin(a * Math.PI / 180), -r * Math.cos(a * Math.PI / 180)];
const f2 = n => Math.round(n * 100) / 100;
function wedge(r0, r1, a0, a1) {
  const big = a1 - a0 > 180 ? 1 : 0, [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1), [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0);
  return `M${f2(x0)} ${f2(y0)}A${r1} ${r1} 0 ${big} 1 ${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}A${r0} ${r0} 0 ${big} 0 ${f2(x3)} ${f2(y3)}Z`;
}
function arc(r, a0, a1) {
  const big = Math.abs(a1 - a0) > 180 ? 1 : 0, [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1);
  return `M${f2(x0)} ${f2(y0)}A${r} ${r} 0 ${big} ${a1 > a0 ? 1 : 0} ${f2(x1)} ${f2(y1)}`;
}
const circle = r => `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${r} ${r} 0 1 1 0 ${-r}`;
let pathId = 0;
/* curved text centred on angle `mid`; upright on both halves; shrinks, then truncates, to fit `span` degrees */
function arcText(txt, r, mid, span, cls, fs, minFs, extra = "", css = "") {
  const upper = Math.cos(mid * Math.PI / 180) > -0.25;
  const avail = r * span * Math.PI / 180;
  let size = fs, t = txt;
  const w = (s, n) => s.length * n * 0.53;
  while (w(t, size) > avail && size > minFs) size -= 0.5;
  if (w(t, size) > avail) { while (t.length > 3 && w(t + "…", size) > avail) t = t.slice(0, -1); t = t + "…"; if (t.length <= 4) return ""; }
  const half = Math.min(span / 2 + 10, 179), id = "tp" + (pathId++);
  const d = upper ? arc(r, mid - half, mid + half) : arc(r, mid + half, mid - half);
  return `<path id="${id}" d="${d}" fill="none" stroke="none"/><text class="${cls}" style="font-size:${size}px;${css}" dominant-baseline="central" ${extra}><textPath href="#${id}" startOffset="50%" text-anchor="middle">${esc(t)}</textPath>${t !== txt ? `<title>${esc(txt)}</title>` : ""}</text>`;
}

/* the three rings: what each slice is coloured by, and how a ring orders experiments inside a sector */
const RINGS = {
  cls:   { label: "Drug class", dim: "cls", sortDim: "cls", color: r => FAMILY[clsFamily[r.cls]][1],
           key: r => [FAM_ORDER.indexOf(clsFamily[r.cls]), DIMS.cls.values.indexOf(r.cls)], name: v => v },
  route: { label: "Route", dim: "route", sortDim: "route", color: r => ROUTE_COL[r.route],
           key: r => [ROUTES.indexOf(r.route), 0], name: v => ROUTE_NAME[v] },
  model: { label: "Model", dim: "modelGroup", sortDim: "modelGroup", color: r => MODEL_COL[r.modelCat][1],
           key: r => [MODEL_CATS.indexOf(r.modelCat), MODEL_GROUPS.indexOf(r.modelGroup)], name: v => v },
};
const RING_SORT = ["cls", "route", "model"];          // order used inside each sector
const RING_RADIAL = ["model", "route", "cls"];        // inner → outer
const ringOfDim = { cls: "cls", route: "route", modelCat: "model", modelGroup: "model" };
const zoneOf = dim => ringOfDim[dim] || (dim === "dosing" ? "dosing" : null);
const SORT_NAME = { cls: "Drug class", route: "Route", model: "Injury model", dosing: "Dosing & duration" };
const SORT_DIM = { cls: "cls", route: "route", model: "modelGroup", dosing: "dosing" };
/* colour of a sector's label = the colour that value has in its own disc */
function sectorColor(dim, v) {
  if (dim === "cls") return FAMILY[clsFamily[v]][1];
  if (dim === "route") return v === "Combined" ? ROUTE_FILL.Combined[1] : ROUTE_COL[v];
  if (dim === "modelGroup") return MODEL_COL[modelCatOf[v]][1];
  if (dim === "modelCat") return MODEL_COL[v][1];
  return DIMS[dim].color(v)[1];
}
/* short names printed on the wheel only; full names stay in the panel, tooltips and lists */

/* sort experiments: sector (chosen condition) first, then drug class → route → model, so colours form blocks */
function layoutWheel(rows) {
  const dim = state.arrange, D = DIMS[dim];
  const sorted = rows.slice().sort((a, b) => {
    const pa = D.values.indexOf(a[dim]), pb = D.values.indexOf(b[dim]); if (pa !== pb) return pa - pb;
    if (dim === "dosing" && (a.dur ?? 9999) !== (b.dur ?? 9999)) return (a.dur ?? 9999) - (b.dur ?? 9999);
    for (const k of RING_SORT) { const ka = RINGS[k].key(a), kb = RINGS[k].key(b); if (ka[0] !== kb[0]) return ka[0] - kb[0]; if (ka[1] !== kb[1]) return ka[1] - kb[1]; }
    return (a.dur ?? 9999) - (b.dur ?? 9999) || a.ref - b.ref || a.id - b.id;
  });
  const sectors = [], groups = [];
  sorted.forEach(r => { let s = sectors[sectors.length - 1]; if (!s || s.value !== r[dim]) { s = { value: r[dim], rows: [] }; sectors.push(s); } s.rows.push(r); });
  sectors.forEach(s => { const p = D.parent ? D.parent(s.value) : "_"; let g = groups[groups.length - 1]; if (!g || g.p !== p) { g = { p, sectors: [] }; groups.push(g); } g.sectors.push(s); });
  const U = 360 - GAP - SECT_GAP * Math.max(0, sectors.length - groups.length) - GROUP_GAP * Math.max(0, groups.length - 1);
  // sector width follows its number of experiments, with a floor so small sectors keep a readable label
  const fixed = new Set(); let slot = 0;
  for (let it = 0; it < 30; it++) {
    const nFixed = [...fixed].reduce((t, s) => t + s.rows.length, 0), free = sorted.length - nFixed;
    slot = free > 0 ? (U - MIN_SECTOR * fixed.size) / free : 0;
    let changed = false;
    sectors.forEach(s => { if (!fixed.has(s) && s.rows.length * slot < MIN_SECTOR) { fixed.add(s); changed = true; } });
    if (!changed) break;
  }
  const allFixed = fixed.size === sectors.length;
  let a = GAP / 2;
  groups.forEach((g, gi) => {
    if (gi) a += GROUP_GAP; g.a0 = a;
    g.sectors.forEach((s, si) => {
      if (si) a += SECT_GAP;
      const w = allFixed ? U / sectors.length : fixed.has(s) ? MIN_SECTOR : s.rows.length * slot, step = w / s.rows.length;
      s.a0 = a; s.rows.forEach(r => { r._a0 = a; r._a1 = a + step; a += step; }); s.a1 = a;
    });
    g.a1 = a;
  });
  return { sectors, groups };
}

const HIT = {}; // hit key -> {title, rows, sel}
let SEL_IDS = null;

function renderWheel() {
  pathId = 0; for (const k in HIT) delete HIT[k];
  const svg = document.getElementById("wheel"), dim = state.arrange, D = DIMS[dim];
  const rows = filtered(), L = layoutWheel(rows), sel = state.sel;
  let out = "";

  // sector backgrounds (tinted by the arranging condition)
  L.sectors.forEach(s => {
    const col = D.color(s.value), key = "s|" + s.value;
    HIT[key] = { title: nameOf(dim, s.value), rows: s.rows, sel: { kind: "sector", value: s.value } };
    out += `<g class="sector" data-hit="${esc(key)}"><path class="sbg" d="${wedge(R.ring.model[0] - 4, R.dur[1] + 6, s.a0 + 0.2, s.a1 - 0.2)}" fill="${col[0]}" style="opacity:var(--tint)"/></g>`;
  });
  // short-duration band, grid circles, empty ring tracks
  if (rows.length) out += `<path class="short" d="${wedge(R.dur[0], rDur(28), GAP / 2, 360 - GAP / 2)}" style="opacity:.75" pointer-events="none"/>`;
  [...TICKS.map(rDur), R.single].forEach(r => out += `<path class="gridc" d="${circle(r)}" pointer-events="none"/>`);
  RING_RADIAL.forEach(k => out += `<path class="ring-bg" d="${wedge(R.ring[k][0], R.ring[k][1], GAP / 2, 360 - GAP / 2)}" pointer-events="none"/>`);

  // sorting panel: the top wedge lists every sort option at the radius of the ring it sorts by
  const onZone = zoneOf(dim), half = GAP / 2 - 1;
  out += `<path class="gap-panel" d="${wedge(R.ring.model[0] - 4, R.band[1], -half, half)}" pointer-events="none"/>`;
  const opt = (txt, r, mid, k, fs, minFs) => arcText(txt, r, mid, 40, "ring-name" + (k === onZone ? " on" : ""), fs, minFs,
    `data-ring="${k}" tabindex="0" role="button" aria-pressed="${k === onZone}" aria-label="Sort the wheel by ${esc(SORT_NAME[k].toLowerCase())}"`);
  RING_RADIAL.forEach(k => { out += opt(RINGS[k].label, (R.ring[k][0] + R.ring[k][1]) / 2, 0, k, 15, 11); });
  out += opt("Single dose", R.single, 0, "dosing", 15, 11);
  out += opt("Repeated dosing", (rDur(28) + rDur(84)) / 2, -7, "dosing", 15, 11);
  out += opt("duration (days)", (rDur(7) + rDur(28)) / 2, -7, "dosing", 14, 11);
  TICKS.forEach(t => { out += arcText(String(t), rDur(t), 15.5, 9, "tick-lbl", 13, 10); });
  // the outermost circle names the active sort
  out += `<path class="sortband" d="${wedge(R.band[0], R.band[1], -half, half)}"/>`;
  out += arcText("SORTED BY · " + D.label.toUpperCase(), (R.band[0] + R.band[1]) / 2, 0, GAP - 4, "sortlbl", 13.5, 9.5);

  L.sectors.forEach(s => {
    const col = D.color(s.value), m = (s.a0 + s.a1) / 2;
    // the three rings: one slice per experiment, consecutive equal values grouped into a hoverable run
    RING_RADIAL.forEach(k => {
      const RG = RINGS[k], [r0, r1] = R.ring[k];
      let i = 0;
      while (i < s.rows.length) {
        const v = s.rows[i][RG.dim]; let j = i;
        while (j < s.rows.length && s.rows[j][RG.dim] === v) j++;
        const run = s.rows.slice(i, j), key = `${k}|${s.value}|${v}|${i}`;
        const same = RG.dim === dim;
        HIT[key] = { title: same ? nameOf(dim, s.value) : `${nameOf(dim, s.value)} · ${RG.name(v)}`, rows: run,
          sel: same ? { kind: "sector", value: s.value } : { kind: "run", value: s.value, ring: k, sub: v } };
        out += `<g class="run" data-hit="${esc(key)}">` + run.map(r => (r.route === "Combined" && k === "route")
          ? `<path class="sl" data-e="${r.id}" d="${wedge((r0 + r1) / 2, r1, r._a0, r._a1)}" fill="${ROUTE_COL.Systemic}"/><path class="sl" data-e="${r.id}" d="${wedge(r0, (r0 + r1) / 2, r._a0, r._a1)}" fill="${ROUTE_COL.Intravitreal}"/>`
          : `<path class="sl" data-e="${r.id}" d="${wedge(r0, r1, r._a0, r._a1)}" fill="${RG.color(r)}"/>`).join("") + `</g>`;
        i = j;
      }
    });
    // dosing rings: a mark at each experiment's own angle
    s.rows.forEach(r => {
      const am = (r._a0 + r._a1) / 2, key = `e|${r.id}`;
      if (r.dur == null) return;
      if (r.dur <= 1) {
        const [x, y] = pt(R.single, am);
        HIT[key] = { title: `${r.compound} · single dose`, rows: [r], sel: { kind: "ids", value: s.value, ids: [r.id], title: `${r.compound} · single dose` } };
        out += `<g class="mark" data-hit="${esc(key)}"><circle cx="${f2(x)}" cy="${f2(y)}" r="11" fill="transparent"/><circle class="dm" data-e="${r.id}" cx="${f2(x)}" cy="${f2(y)}" r="6.5" fill="${col[1]}" style="stroke:var(--panel)" stroke-width="1.4"/></g>`;
      } else {
        const rr = rDur(r.dur), [x0, y0] = pt(R.dur[0], am), [x, y] = pt(rr, am), t = `${r.compound} · ${r.dur} days of dosing`;
        HIT[key] = { title: t, rows: [r], sel: { kind: "ids", value: s.value, ids: [r.id], title: t } };
        out += `<g class="mark" data-hit="${esc(key)}"><line class="stem dm" data-e="${r.id}" x1="${f2(x0)}" y1="${f2(y0)}" x2="${f2(x)}" y2="${f2(y)}"/><circle cx="${f2(x)}" cy="${f2(y)}" r="11" fill="transparent"/><circle class="dm" data-e="${r.id}" cx="${f2(x)}" cy="${f2(y)}" r="6.5" fill="${col[1]}" style="stroke:var(--panel)" stroke-width="1.4"/></g>`;
      }
    });
    // sector label
    const isSel = sel && sel.value === s.value, faint = SEL_IDS && !s.rows.some(r => SEL_IDS.has(r.id));
    const full = nameOf(dim, s.value), short = SHORT[full] || full;
    out += `<g class="sector" data-hit="${esc("s|" + s.value)}" tabindex="0" role="button" aria-label="${esc(full)}, ${plural(s.rows.length, "experiment")}">${arcText(short, R.label, m, Math.max(s.a1 - s.a0 - 0.8, 4), "lbl" + (isSel ? " sel" : "") + (faint ? " faint" : ""), 19, 11.5, "", `fill:color-mix(in oklab, ${sectorColor(dim, s.value)} 70%, var(--fg))`)}<title>${esc(full)}</title></g>`;
  });
  // outline the ring that drives the sort
  if (onZone) {
    const [z0, z1] = onZone === "dosing" ? [R.single - 14, R.dur[1] + 3] : R.ring[onZone];
    [z0 - 1.5, z1 + 1.5].forEach(r => out += `<path class="active-edge" d="${arc(r, GAP / 2, 360 - GAP / 2)}" pointer-events="none"/>`);
  }
  // outer band: colour-coded under each category (same colour as in its disc), group names on top
  L.groups.forEach(g => {
    g.sectors.forEach((s, i) => {
      const a0 = i ? s.a0 - SECT_GAP / 2 : g.a0 + 0.3, a1 = i < g.sectors.length - 1 ? s.a1 + SECT_GAP / 2 : g.a1 - 0.3;
      out += `<path class="gband" d="${wedge(R.band[0], R.band[1], a0, a1)}" style="fill:color-mix(in oklab, ${sectorColor(dim, s.value)} 82%, #000)" data-hit="${esc("s|" + s.value)}"><title>${esc(nameOf(dim, s.value))}</title></path>`;
    });
    if (D.parent) out += arcText(g.p.toUpperCase(), (R.band[0] + R.band[1]) / 2, (g.a0 + g.a1) / 2, g.a1 - g.a0 - 2, "glbl", 14, 10);
  });
  // open centre with the totals
  out += `<g class="centre" data-hit="c"><circle class="hole" r="${R.hole}" fill="transparent"/>`;
  out += `<text class="c-n" y="-4">${rows.length}</text><text class="c-t" y="20">${rows.length === 1 ? "experiment" : "experiments"}</text>`;
  out += `<text class="c-s" y="42">${plural(nCompounds(rows), "compound")}</text><text class="c-s" y="58">${nStudies(rows)} ${nStudies(rows) === 1 ? "study" : "studies"}</text></g>`;
  if (!rows.length) out += `<text class="c-t" y="150">No experiments match these conditions.</text>`;
  svg.innerHTML = out;
  applyHighlight(SEL_IDS);
}
/* light up a set of experiments in every ring and dosing mark at once */
function applyHighlight(ids) {
  const svg = document.getElementById("wheel");
  svg.classList.toggle("focus", !!ids);
  svg.querySelectorAll("[data-e]").forEach(el => el.classList.toggle("hl", !!ids && ids.has(+el.dataset.e)));
}

/* ---------------- tooltip + clicks ---------------- */
const tip = document.getElementById("tip");
function compoundsLine(rows) {
  const m = {}; rows.forEach(r => m[r.compound] = (m[r.compound] || 0) + 1);
  const list = Object.entries(m).sort((a, b) => b[1] - a[1]).map(([c, n]) => n > 1 ? `${c} (${n})` : c);
  return list.length > 8 ? list.slice(0, 8).join(", ") + `, +${list.length - 8} more` : list.join(", ");
}
const wheel = document.getElementById("wheel");
let hoverKey = null;
wheel.addEventListener("pointermove", e => {
  const g = e.target.closest("[data-hit]"), key = g && g.dataset.hit, h = key && HIT[key];
  if (!h) { if (hoverKey) { hoverKey = null; applyHighlight(SEL_IDS); } tip.hidden = true; return; }
  if (key !== hoverKey) { hoverKey = key; applyHighlight(new Set(h.rows.map(r => r.id))); }
  if (e.pointerType === "touch") { tip.hidden = true; return; }
  const one = h.rows.length === 1 ? h.rows[0] : null;
  tip.innerHTML = `<b>${esc(h.title)}</b><div class="tn">${plural(h.rows.length, "experiment")} · ${plural(nStudies(h.rows), "study").replace("studys", "studies")}</div><div class="tc">${one ? `${esc(one.cls)} · ${esc(ROUTE_NAME[one.route])} · ${esc(one.model)} · [${one.ref}] ${esc(REFS[one.ref].short)}` : esc(compoundsLine(h.rows))}</div>`;
  tip.hidden = false;
  const pad = 14, w = tip.offsetWidth, hgt = tip.offsetHeight;
  let x = e.clientX + pad, y = e.clientY + pad;
  if (x + w > innerWidth - 8) x = e.clientX - w - pad;
  if (y + hgt > innerHeight - 8) y = e.clientY - hgt - pad;
  tip.style.left = x + "px"; tip.style.top = y + "px";
});
wheel.addEventListener("pointerleave", () => { tip.hidden = true; hoverKey = null; applyHighlight(SEL_IDS); });
function activate(g) {
  if (!g) return;
  if (g.dataset.ring) { setArrange(SORT_DIM[g.dataset.ring]); return; }
  if (g.dataset.hit === "c") { state.sel = null; render(); return; }
  const h = HIT[g.dataset.hit]; if (!h) return;
  const s = h.sel, same = state.sel && JSON.stringify(state.sel) === JSON.stringify(s);
  state.sel = same ? null : s; hoverKey = null; render();
  if (state.sel && innerWidth <= 1240) document.querySelector(".details").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}
wheel.addEventListener("click", e => activate(e.target.closest("[data-ring],[data-hit]")));
wheel.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(e.target.closest("[data-ring],[data-hit]")); } });

/* ---------------- selection -> rows ---------------- */
function selectionRows(rows) {
  const s = state.sel, dim = state.arrange; if (!s) return rows;
  let out = rows.filter(r => r[dim] === s.value);
  if (s.kind === "run") out = out.filter(r => r[RINGS[s.ring].dim] === s.sub);
  if (s.kind === "ids") out = out.filter(r => s.ids.includes(r.id));
  return out;
}
function selectionTitle() {
  const s = state.sel, dim = state.arrange; if (!s) return "All matching experiments";
  if (s.kind === "run") return `${nameOf(dim, s.value)} · ${RINGS[s.ring].name(s.sub)}`;
  if (s.kind === "ids") return s.title;
  return nameOf(dim, s.value);
}

/* ---------------- details list ---------------- */
function durTxt(r) {
  if (r.dur == null) return "duration not reported";
  if (r.dur <= 1) return "single dose";
  return `<span class="num">${r.dur}</span> d dosing`;
}
function renderDetails() {
  const all = filtered(), rows = selectionRows(all);
  SEL_IDS = state.sel ? new Set(rows.map(r => r.id)) : null;
  document.getElementById("detTitle").textContent = selectionTitle();
  document.getElementById("clearSel").hidden = !state.sel;
  document.getElementById("detMeta").textContent = `${plural(rows.length, "experiment")} · ${nCompounds(rows)} compound${nCompounds(rows) === 1 ? "" : "s"} · ${nStudies(rows)} ${nStudies(rows) === 1 ? "study" : "studies"}`;
  const nb = document.getElementById("narrow");
  nb.hidden = !state.sel || state.sel.kind === "ids";
  const byRef = {}; rows.forEach(r => (byRef[r.ref] = byRef[r.ref] || []).push(r));
  let refs = Object.keys(byRef).map(Number);
  const s = state.sort;
  refs.sort((a, b) => s === "year" ? (REFS[b].year - REFS[a].year) || a - b
    : s === "compound" ? byRef[a][0].compound.localeCompare(byRef[b][0].compound) || a - b
    : s === "n" ? byRef[b].length - byRef[a].length || a - b : a - b);
  document.getElementById("list").innerHTML = refs.length ? refs.map(n => {
    const R0 = REFS[n];
    return `<article class="study"><button class="refbtn" type="button" data-ref="${n}" aria-label="Open reference ${n}"><span class="rn">[${n}]</span><span class="ra">${esc(R0.short)}</span><span class="rt">${esc(R0.title)}</span></button>
      ${byRef[n].map(r => `<div class="exp"><div><span class="cmp">${esc(r.compound)}</span><span class="cls">${esc(r.cls)}</span></div><span class="pill ${OUT_PILL[r.outcome]}">${esc(r.outcome)}</span>
        <div class="facts">${esc(r.species)} · ${esc(r.model)} · ${esc(ROUTE_NAME[r.route])}${r.routeDetail ? ` (${esc(r.routeDetail)})` : ""} · ${durTxt(r)}${r.endpoint != null ? ` · readout at <span class="num">${r.endpoint}</span> d` : ""}</div></div>`).join("")}</article>`;
  }).join("") : `<p class="empty">No experiments match. Clear a filter on the left.</p>`;
}
document.getElementById("list").addEventListener("click", e => { const b = e.target.closest("[data-ref]"); if (b) openRef(+b.dataset.ref); });
document.getElementById("sortBy").addEventListener("change", e => { state.sort = e.target.value; remember(); renderDetails(); });
document.getElementById("clearSel").addEventListener("click", () => { state.sel = null; render(); });
document.getElementById("narrow").addEventListener("click", () => {
  const s = state.sel; if (!s) return;
  state.filters[state.arrange].add(s.value);
  if (s.kind === "run") state.filters[RINGS[s.ring].dim].add(s.sub);
  state.sel = null; render();
});
document.getElementById("copyTable").addEventListener("click", () => {
  const rows = selectionRows(filtered());
  const head = ["Ref", "Citation", "DOI", "Compound", "Drug class", "Species", "Model", "Model category", "Route", "Route detail", "Treatment days", "Readout day", "RGC outcome"];
  const lines = [head.join("\t")].concat(rows.map(r => [r.ref, REFS[r.ref].short, REFS[r.ref].doi || "", r.compound, r.cls, r.species, r.model, r.modelCat, ROUTE_NAME[r.route], r.routeDetail, r.dur ?? "", r.endpoint ?? "", r.outcome].join("\t")));
  copyText(lines.join("\n"), document.getElementById("copyMsg"), `Copied ${plural(rows.length, "row")}. Paste into Excel or Sheets.`);
});
function copyText(text, msgEl, ok) {
  const done = () => { msgEl.textContent = ok; setTimeout(() => msgEl.textContent = "", 3500); };
  try { navigator.clipboard.writeText(text).then(done, () => fallback()); } catch (e) { fallback(); }
  function fallback() { msgEl.textContent = "Copy is blocked here. Select the text in the box and copy it."; const ta = document.createElement("textarea"); ta.value = text; ta.rows = 4; msgEl.after(ta); ta.select(); }
}

/* ---------------- reference dialog ---------------- */
const dlg = document.getElementById("refDlg");
function openRef(n) {
  const R0 = REFS[n], exps = ROWS.filter(r => r.ref === n);
  const link = R0.doi ? `<a class="btn primary" href="${esc(R0.doi)}" target="_blank" rel="noopener">Open article (DOI)</a>`
    : `<a class="btn primary" href="https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(R0.title)}" target="_blank" rel="noopener">Search PubMed</a>`;
  document.getElementById("dlgBody").innerHTML = `<button class="btn x" type="button" id="dlgClose" aria-label="Close">Close</button>
    <div class="dn">Reference [${n}] in the review</div>
    <h2 id="dlgTitle">${esc(R0.title)}</h2>
    <div class="au">${esc(R0.authors)}</div>
    <div><span class="jr">${esc(R0.journal)}</span>${R0.year ? `, ${R0.year}` : ""}${R0.doi ? ` · <span style="font-family:var(--f-num);font-size:.8rem">${esc(R0.doi.replace("https://doi.org/", "doi:"))}</span>` : ""}</div>
    <div class="acts">${link}<button class="btn" type="button" id="dlgCopy">Copy citation</button><span class="copied" id="dlgMsg" role="status"></span></div>
    <div><div class="eyebrow" style="margin:6px 0 2px">${plural(exps.length, "experiment")} from this paper</div>
    ${exps.map(r => `<div class="exp"><div><span class="cmp">${esc(r.compound)}</span><span class="cls">${esc(r.cls)}</span></div><span class="pill ${OUT_PILL[r.outcome]}">${esc(r.outcome)}</span><div class="facts">${esc(r.species)} · ${esc(r.model)} · ${esc(ROUTE_NAME[r.route])}${r.routeDetail ? ` (${esc(r.routeDetail)})` : ""} · ${durTxt(r)}</div></div>`).join("")}</div>`;
  document.getElementById("dlgClose").onclick = () => dlg.close();
  document.getElementById("dlgCopy").onclick = () => copyText(`${R0.full}${R0.doi ? " " + R0.doi : ""}`, document.getElementById("dlgMsg"), "Citation copied.");
  tip.hidden = true;
  if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
}
dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

/* ---------------- chips, key, header ---------------- */
function renderChips() {
  const host = document.getElementById("chips"); let h = "";
  DIM_ORDER.forEach(d => state.filters[d].forEach(v => h += `<span class="chip"><span class="k">${esc(DIMS[d].short)}:</span>${esc(nameOf(d, v))}<button type="button" data-rm="${d}" data-v="${esc(v)}" aria-label="Remove ${esc(nameOf(d, v))}">×</button></span>`));
  if (state.q) h += `<span class="chip"><span class="k">search:</span>${esc(state.q)}<button type="button" data-rmq="1" aria-label="Clear search">×</button></span>`;
  host.innerHTML = h || `<span class="hint">No filters. Showing every experiment in Tables 1–3.</span>`;
  document.getElementById("clearAll").disabled = !h;
}
document.getElementById("chips").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.rmq) { state.q = ""; document.getElementById("q").value = ""; }
  else state.filters[b.dataset.rm].delete(b.dataset.v);
  state.sel = null; render();
});
function renderKey() {
  const item = (bg, txt) => `<span><i style="background:${bg}"></i>${esc(txt)}</span>`, onRing = ringOfDim[state.arrange];
  const rows = [
    ["cls", FAM_ORDER.map(f => item(FAMILY[f][1], FAM_NAME[f]))],
    ["route", ROUTES.filter(r => ROWS.some(x => x.route === r)).map(r => r === "Combined"
      ? item(`linear-gradient(${ROUTE_COL.Systemic} 50%, ${ROUTE_COL.Intravitreal} 50%)`, ROUTE_NAME[r]) : item(ROUTE_COL[r], ROUTE_NAME[r]))],
    ["model", MODEL_CATS.map(m => item(MODEL_COL[m][1], m))],
  ];
  document.getElementById("key").innerHTML = rows.map(([k, items]) =>
    `<div class="lrow"><span class="lname${k === onRing ? " on" : ""}">${RINGS[k].label}</span><span class="litems">${items.join("")}</span></div>`).join("")
    + `<div class="lrow"><span class="lname">Dosing</span><span class="litems"><span><i style="background:var(--short-band);border:1px solid var(--line)"></i>≤ 28 days of dosing</span></span></div>`;
}
function render() {
  const rows = filtered();
  document.getElementById("totals").innerHTML = `<b>${rows.length}</b> of ${ROWS.length} experiments · <b>${nCompounds(rows)}</b> compounds · <b>${nStudies(rows)}</b> studies`;
  const D = DIMS[state.arrange];
  document.getElementById("arrLabel").innerHTML = `Wheel arranged by <b>${esc(D.label.toLowerCase())}</b>`;
  document.getElementById("resetView").hidden = state.arrange === "cls";
  document.getElementById("sortBy").value = state.sort;
  renderFacets(); renderChips(); renderKey(); renderDetails(); renderWheel();
}
document.getElementById("q").addEventListener("input", e => { state.q = e.target.value.trim(); state.sel = null; render(); });
document.getElementById("clearAll").addEventListener("click", () => { DIM_ORDER.forEach(d => state.filters[d].clear()); state.q = ""; document.getElementById("q").value = ""; state.sel = null; render(); });
document.getElementById("resetView").addEventListener("click", () => setArrange("cls"));
render();
