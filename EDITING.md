# Editing the wheel

Everything you can change is in two places: the `src/` folder (how the page looks and
behaves) and the Excel workbook in `data/` (the experiments). `index.html` is generated
from them, so never edit `index.html` itself: your changes would be overwritten at the
next build.

## The workflow

1. **Edit** a file in `src/` with any text editor (Notepad++, VS Code, or even Notepad).
2. **Preview:** open `src/page.html` in your browser (double-click it). After each change,
   save the file and press F5 in the browser. The preview uses the current data in
   `data/data.js`. It loads the fonts from the internet, so offline it uses a fallback font.
3. **Build:** double-click `build_index.bat` (Windows) or run
   `python3 scripts/prep.py && python3 scripts/build.py`. This rewrites `index.html`.
4. **Publish:** upload the changed files (at least `index.html` and the files you edited)
   to GitHub. The live page updates within a minute or two.
5. **Figure (optional):** double-click `render_figure.bat` to re-export the graphical
   abstract into `figure/`.

One-time setup for steps 3 and 5: install Python from python.org (tick "Add Python to
PATH"), then in a terminal opened in this folder run `pip install -r requirements.txt`, and
for the figure also `python -m playwright install chromium`.

## Where to change what

| I want to change… | File | Where |
|---|---|---|
| Page title, introduction, help line under the wheel, footer | `src/page.html` | plain text between the tags; keep every `id="…"` |
| Page colours (background, panels, accent), fonts, spacing | `src/wheel.css` | colour tokens at the top: `:root` = light theme, the two blocks below = dark theme (change both alike) |
| Colour of a drug-class pathway, route, model category, dosing group, species or outcome | `src/settings.js` | `FAMILY`, `ROUTE_COL` (rings) and `ROUTE_FILL` (labels, band), `MODEL_COL`, `DOSE_FILL`, `SPECIES_FILL`, `OUT_FILL` |
| Order or grouping of drug classes on the wheel | `src/settings.js` | `CLASSES` |
| Order of routes, model categories, dosing groups, outcomes | `src/settings.js` | `ROUTES`, `MODEL_CATS`, `DOSING`, `OUTCOMES` |
| Names of the pathway branches in the legend | `src/settings.js` | `FAM_NAME` |
| Shortened labels printed on the wheel | `src/settings.js` | `SHORT` (add `"Full name": "Short name",`) |
| Size of the sorting wedge, ring widths, label distance, smallest sector | `src/settings.js` | `GAP`, `R`, `MIN_SECTOR` |
| Duration scale and its tick labels | `src/settings.js` | `DMIN`, `DMAX`, `TICKS` |
| An experiment, a reference, a category of an experiment | `data/RGC_wheel_source_data.xlsx` | *Experiments* and *References* sheets, then build |
| How the wheel sorts, draws or reacts to clicks | `src/wheel.js` | behaviour code (needs some JavaScript) |

Colour pairs in `settings.js` are written `[light tint, strong colour]`, as hex codes. The
tint fills sector backgrounds and swatches; the strong colour draws ring slices, dots,
labels and the outer band.

## Rules that keep it working

- Category names must be spelled exactly as in the workbook (including Greek letters,
  e.g. `TNF-α`, and the spaces in `NLRP3 / ASC`). A new drug class must be added to
  `CLASSES` with a colour family.
- Keep the commas, quotes and brackets in `settings.js`: each line is a list or a lookup
  table. If the preview turns blank after an edit, press F12 in the browser and open the
  *Console* tab: it names the file and line with the error.
- Keep the `id="…"` attributes and the three `<script src="…">` lines at the bottom of
  `src/page.html`; `scripts/build.py` replaces them when building `index.html`.
- Save a copy of a file before a large change, or rely on GitHub: every uploaded version
  is kept in the repository history and can be restored.
- After editing the workbook, close it in Excel before running the build.
