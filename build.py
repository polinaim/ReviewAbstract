"""
Step 2 of 3: build index.html, the interactive wheel as one self-contained file.

It assembles the editable parts in src/ into a single page:
    src/page.html     page text and structure (also opens directly as a live preview)
    src/wheel.css     page styles and colour tokens
    src/settings.js   category colours, order, short labels, wheel sizes
    src/wheel.js      behaviour
    data/data.js      the experiments (written by scripts/prep.py)
and embeds the IBM Plex fonts from fonts/, so index.html makes no request to any other
website and works offline, on GitHub Pages, a journal or an institutional server alike.

Usage : python3 scripts/build.py                 # fonts embedded (default)
        python3 scripts/build.py --google-fonts  # smaller file; loads fonts from Google Fonts
"""
import argparse
import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
FACES = [  # family, file stem, weight, style
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


def font_css():
    rules = []
    for family, stem, weight, style in FACES:
        b64 = base64.b64encode((ROOT / "fonts" / f"{stem}.woff2").read_bytes()).decode()
        rules.append(f"@font-face{{font-family:'{family}';font-weight:{weight};font-style:{style};font-display:swap;"
                     f"src:url(data:font/woff2;base64,{b64}) format('woff2');}}")
    return "\n".join(rules)


def inline_script(path):
    code = path.read_text(encoding="utf-8")
    if "</script" in code.lower():
        raise SystemExit(f"{path.name} contains '</script', which would end the inline script early")
    return f"<script>\n{code.rstrip()}\n</script>"


def replace_once(page, old, new, what):
    if page.count(old) != 1:
        raise SystemExit(f"src/page.html: expected exactly one {what} ({old!r}); was it removed or changed?")
    return page.replace(old, new)


def main(google_fonts):
    page = (SRC / "page.html").read_text(encoding="utf-8")
    css = (SRC / "wheel.css").read_text(encoding="utf-8")
    if not google_fonts:
        page = re.sub(r'<link rel="preconnect"[^>]*>\s*', "", page)
        page = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>\s*', "", page)
        css = font_css() + "\n" + css
    page = replace_once(page, '<link rel="stylesheet" href="wheel.css">', f"<style>\n{css.rstrip()}\n</style>", "stylesheet link")
    page = replace_once(page, '<script src="../data/data.js"></script>', inline_script(ROOT / "data" / "data.js"), "data script")
    page = replace_once(page, '<script src="settings.js"></script>', inline_script(SRC / "settings.js"), "settings script")
    page = replace_once(page, '<script src="wheel.js"></script>', inline_script(SRC / "wheel.js"), "wheel script")
    (ROOT / "index.html").write_text(page, encoding="utf-8")
    print(f"Wrote index.html ({len(page.encode()) / 1024:.0f} KB, fonts {'from Google Fonts' if google_fonts else 'embedded'})")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--google-fonts", action="store_true", help="load fonts from Google Fonts instead of embedding them")
    main(ap.parse_args().google_fonts)
