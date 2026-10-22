/* =====================================================================
   RGC Neuroprotection Wheel: settings you can safely change
   ---------------------------------------------------------------------
   Each colour pair is [light tint, strong colour]: the tint is used for
   sector backgrounds and swatch fills, the strong colour for ring slices,
   dots, labels and the outer band. Category names must match the
   spelling in the Excel workbook exactly.
   After editing, refresh src/page.html to preview; run build_index.bat
   (or scripts/build.py) to update index.html for publishing.
   ===================================================================== */

/* ---- Categories: colours and order ---------------------------------
   FAMILY   pathway colours of the drug classes (as in Figure 2)
   CLASSES  drug classes, grouped as in Tables 1-3 (order = order on the wheel)
   The other lists set the order in which categories appear. */
const FAMILY = { blue: ["#BFDDF4", "#5E9BCF"], mint: ["#BFE6E0", "#4FA99B"], lav: ["#D6CEEA", "#8C7BBF"], yellow: ["#F6DFA0", "#D2A537"], grey: ["#E6E6E6", "#9E9E9E"] };
const CLASSES = [
  ["Cytokine antagonists", [["TNF-α", "blue"], ["IL-1β", "mint"], ["IL-6", "yellow"]]],
  ["Pathway inhibitors", [["RIPK1/3", "blue"], ["p38 MAPK", "blue"], ["JNK", "blue"], ["TLR4", "mint"], ["NF-κB", "mint"], ["P2X7", "lav"], ["NLRP3 / ASC", "lav"], ["JAK/STAT3", "yellow"]]],
  ["Broad agents", [["Glial inhibition", "grey"], ["Rho kinase", "grey"], ["PDE", "grey"], ["Antioxidant", "grey"], ["Calcineurin", "grey"], ["COX", "grey"], ["A2A receptor", "grey"], ["Antibiotic", "grey"]]],
];
const MODEL_CATS = ["Acute injury", "Induced OHT", "Genetic / metabolic"];
const MODEL_COL = { "Acute injury": ["#F6DCD9", "#E59A92"], "Induced OHT": ["#EFCACA", "#C4484A"], "Genetic / metabolic": ["#E3C3C8", "#741F2E"] };
const ROUTES = ["Systemic", "Intravitreal", "Topical", "Periocular", "Combined"];
const ROUTE_COL = { Systemic: "#3F5D8A", Intravitreal: "#D9A066", Topical: "#5FA8A0", Periocular: "#A8D3CC", Combined: "#3F5D8A" };
const ROUTE_FILL = { Systemic: ["#C9D3E3", "#3F5D8A"], Intravitreal: ["#F2DDC4", "#C98A45"], Topical: ["#C8E4E0", "#4C948C"], Periocular: ["#DDF0EC", "#6FB2A7"], Combined: ["#D9D5DE", "#6C6380"] };
const ROUTE_NAME = { Systemic: "Systemic", Intravitreal: "Intravitreal", Topical: "Topical", Periocular: "Subconjunctival / retrobulbar", Combined: "Systemic + intravitreal" };
const DOSING = ["Single dose", "2–7 days", "8–28 days", "1–3 months", "> 3 months", "Not reported"];
const DOSE_FILL = { "Single dose": ["#D7EEF0", "#3E8F98"], "2–7 days": ["#C4E3E6", "#357F88"], "8–28 days": ["#AED6DA", "#2C6F77"], "1–3 months": ["#94C6CB", "#245E66"], "> 3 months": ["#7AB4BA", "#1C4E55"], "Not reported": ["#E6E6E6", "#9E9E9E"] };
const OUTCOMES = ["Protective", "Partial", "Axonal only", "No protection", "No RGC readout", "Not determined"];
const OUT_FILL = { "Protective": ["#CFEBD9", "#3C8D5D"], "Partial": ["#F5E3BC", "#B9862A"], "Axonal only": ["#F7EBCF", "#C49A47"], "No protection": ["#F1CDCD", "#B44B4B"], "No RGC readout": ["#E4E8E9", "#87959A"], "Not determined": ["#EDEFF0", "#A3AEB2"] };
const OUT_PILL = { "Protective": "p-good", "Partial": "p-warn", "Axonal only": "p-warn", "No protection": "p-bad", "No RGC readout": "p-none", "Not determined": "p-none" };
const SPECIES_FILL = { Mouse: ["#D3DCE8", "#6D84A0"], Rat: ["#E3DACB", "#9A8460"], Rabbit: ["#E6DAEA", "#9B7AA5"] };

/* ---- Pathway names shown in the legend, in legend order ------------ */
const FAM_ORDER = ["blue", "mint", "lav", "yellow", "grey"];
const FAM_NAME = { blue: "TNF / RIPK / MAPK", mint: "TLR4 / IL-1R / NF-κB", lav: "P2X7 / NLRP3", yellow: "IL-6 / JAK-STAT3", grey: "Broad anti-inflammatory" };

/* ---- Wheel geometry (in drawing units; the wheel is 1016 units wide) --
   GAP         width of the sorting wedge at the top, in degrees
   R.hole      radius of the open centre
   R.ring      inner/outer radius of the three colour rings
   R.single    radius of the single-dose track
   R.dur       inner/outer radius of the treatment-duration ring
   R.band      inner/outer radius of the outer colour band
   R.label     radius of the category labels
   MIN_SECTOR  smallest width of a sector, in degrees (keeps labels readable)
   SECT_GAP / GROUP_GAP  spaces between sectors / between groups, in degrees
   DMIN, DMAX  range of the log duration scale (days); TICKS = scale labels */
const GAP = 46, R = { hole: 78, ring: { model: [86, 124], route: [130, 168], cls: [174, 212] }, single: 238, dur: [262, 422], band: [434, 456], label: 478 };
const MIN_SECTOR = 11, SECT_GAP = 1.2, GROUP_GAP = 4;
const DMIN = 1.6, DMAX = 420, TICKS = [3, 7, 28, 84, 168, 365];

/* ---- Short names printed on the wheel (full names stay in the panel,
        tooltips and lists). Add a line to shorten any label. ---------- */
const SHORT = {
  "Optic nerve axotomy / transection": "Axotomy / transection", "Retinal ischemia / acute IOP elevation": "Ischemia / acute IOP",
  "Blast traumatic brain injury": "Blast TBI", "Col8a2 neovascular glaucoma": "Col8a2 NVG", "Chronic OHT (method n.s.)": "Chronic OHT",
  "Oxygen-induced retinopathy": "O₂ retinopathy", "Hypertonic saline OHT": "Hypertonic saline", "Episcleral vein OHT": "Episcleral vein",
  "Laser-induced OHT": "Laser OHT", "Hydrogel-induced OHT": "Hydrogel OHT", "S100B intravitreal": "S100B", "Corneal alkali burn": "Alkali burn",
  "NMDA excitotoxicity": "NMDA", "Subconjunctival / retrobulbar": "Subconj. / retrobulbar", "Systemic + intravitreal": "Systemic + IVT",
};
