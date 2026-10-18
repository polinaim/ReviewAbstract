"""
Step 3 of 3: render the wheel as the static graphical abstract.

It opens the same self-contained page that is published online (index.html),
keeps the default view (wheel sorted by drug class, no filters, nothing selected),
and exports only the wheel and its legend.

Outputs (in --outdir):
    graphical_abstract_wheel.png   raster at --dpi (default 600), dpi stored in the file
    graphical_abstract_wheel.tif   same raster, LZW-compressed TIFF (many journals ask for TIFF)
    graphical_abstract_wheel.pdf   vector version (text stays text)

Usage
    python3 scripts/render_graphical_abstract.py             # 600 dpi, 6.5 in wide, into figure/
    python3 scripts/render_graphical_abstract.py --dpi 300 --width-in 3.5

Needs: python3, playwright (pip install playwright; python -m playwright install chromium), pillow.
index.html already embeds its fonts (scripts/build.py), so no internet access is needed.
"""
import argparse
import asyncio
import base64
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
FIG_CSS_WIDTH = 900          # layout width of the figure in CSS pixels

# family name used by the page -> font file stem -> CSS weight / style
FACES = [
    ("IBM Plex Sans Condensed", "IBMPlexSansCondensed-Regular", 400, "normal"),
    ("IBM Plex Sans Condensed", "IBMPlexSansCondensed-Medium", 500, "normal"),
    ("IBM Plex Sans Condensed", "IBMPlexSansCondensed-SemiBold", 600, "normal"),
    ("IBM Plex Sans Condensed", "IBMPlexSansCondensed-Bold", 700, "normal"),
    ("IBM Plex Sans", "IBMPlexSans-Regular", 400, "normal"),
    ("IBM Plex Sans", "IBMPlexSans-Medium", 500, "normal"),
    ("IBM Plex Sans", "IBMPlexSans-SemiBold", 600, "normal"),
    ("IBM Plex Sans", "IBMPlexSans-Italic", 400, "italic"),
    ("IBM Plex Mono", "IBMPlexMono-Regular", 400, "normal"),
    ("IBM Plex Mono", "IBMPlexMono-Medium", 500, "normal"),
]

FIGURE_JS = """(w) => {
  // keep only the wheel and its legend, on a white page, in the light theme
  const wheel = document.getElementById('wheel'), key = document.getElementById('key');
  const fig = document.createElement('div');
  fig.id = 'fig';
  fig.append(wheel, key);
  document.querySelector('.wrap').replaceWith(fig);
  document.getElementById('tip')?.remove();
  document.getElementById('refDlg')?.remove();
  const st = document.createElement('style');
  st.textContent = `
    html, body { margin: 0; padding: 0; background: #fff; }
    #fig { width: ${w}px; box-sizing: border-box; padding: 6px 24px 22px; background: #fff; }
    #fig svg.wheel { width: 100%; height: auto; display: block; }
    #fig .key { margin-top: 2px; max-width: none; }
    #fig .key .lrow { font-size: 13px; }`;
  document.head.append(st);
  // crop the drawing to its content (the interactive page leaves room around the wheel)
  const bb = wheel.getBBox(), pad = 6;
  wheel.setAttribute('viewBox', `${bb.x - pad} ${bb.y - pad} ${bb.width + 2 * pad} ${bb.height + 2 * pad}`);
}"""


def font_css(font_dir):
    """@font-face rules with the .woff2 files embedded as data URIs."""
    files = {p.stem: p for p in Path(font_dir).rglob("*.woff2") if "/split/" not in p.as_posix()}
    rules, missing = [], []
    for family, stem, weight, style in FACES:
        p = files.get(stem)
        if not p:
            missing.append(stem)
            continue
        b64 = base64.b64encode(p.read_bytes()).decode()
        rules.append(f"@font-face{{font-family:'{family}';font-weight:{weight};font-style:{style};"
                     f"src:url(data:font/woff2;base64,{b64}) format('woff2');}}")
    if missing:
        raise SystemExit(f"Font files not found in {font_dir}: {', '.join(missing)}")
    return "\n".join(rules)


async def render(args):
    page_path = (ROOT / args.html).resolve()
    scale = args.dpi * args.width_in / FIG_CSS_WIDTH
    out = Path(args.outdir)
    out.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": FIG_CSS_WIDTH, "height": 1200},
                                      device_scale_factor=scale, color_scheme="light")
        await page.goto(page_path.as_uri(), wait_until="load")
        if args.fonts:   # optional: use other copies of the font files
            await page.add_style_tag(content=font_css(args.fonts))
        await page.evaluate("document.fonts.ready")
        await page.evaluate(FIGURE_JS, FIG_CSS_WIDTH)
        await page.evaluate("document.fonts.ready")
        fams = await page.evaluate("""() => ['IBM Plex Sans Condensed','IBM Plex Sans','IBM Plex Mono']
                                       .map(f => f + ': ' + document.fonts.check('600 16px "' + f + '"'))""")
        print("fonts loaded:", ", ".join(fams))
        fig = page.locator("#fig")
        box = await fig.bounding_box()
        png = out / "graphical_abstract_wheel.png"
        await fig.screenshot(path=str(png), omit_background=False)
        # vector PDF of the same layout
        await page.set_viewport_size({"width": FIG_CSS_WIDTH, "height": int(box["height"]) + 1})
        k = args.width_in * 96 / FIG_CSS_WIDTH            # print at the same physical width as the PNG
        await page.pdf(path=str(out / "graphical_abstract_wheel.pdf"), print_background=True, scale=k,
                       width=f"{args.width_in:.4f}in", height=f"{(box['height'] + 1) * k / 96:.4f}in",
                       margin={"top": "0", "right": "0", "bottom": "0", "left": "0"})
        await browser.close()
    im = Image.open(png).convert("RGB")
    im.save(png, dpi=(args.dpi, args.dpi), optimize=True)
    im.save(out / "graphical_abstract_wheel.tif", dpi=(args.dpi, args.dpi), compression="tiff_lzw")
    w, h = im.size
    print(f"Saved {png.name}, .tif, .pdf: {w} x {h} px = {w / args.dpi:.2f} x {h / args.dpi:.2f} in "
          f"({w / args.dpi * 2.54:.1f} x {h / args.dpi * 2.54:.1f} cm) at {args.dpi} dpi")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--html", default="index.html", help="built page, relative to the repository root")
    ap.add_argument("--outdir", default=str(ROOT / "figure"), help="output folder")
    ap.add_argument("--dpi", type=int, default=600)
    ap.add_argument("--width-in", type=float, default=6.5, help="printed width in inches (6.5 in = 16.5 cm)")
    ap.add_argument("--fonts", help="optional folder with IBM Plex .woff2 files (index.html already embeds them)")
    asyncio.run(render(ap.parse_args()))
