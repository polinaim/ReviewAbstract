"""
Step 1 of 3: read data/RGC_wheel_source_data.xlsx and write data/data.json and data/data.js.

Only rows with In Tables 1-3 = yes and Include in figure = yes are drawn (80 experiments).
The dosing group is recomputed from the treatment duration and checked against the
workbook's formula column, so the workbook does not need to be recalculated first.

Usage : python3 scripts/prep.py [path/to/workbook.xlsx]
"""
import json
import sys
from collections import Counter
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
XLSX = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data" / "RGC_wheel_source_data.xlsx"
OUT = ROOT / "data" / "data.json"


def dose_bin(x):
    if pd.isna(x): return "Not reported"
    if x <= 1: return "Single dose"
    if x <= 7: return "2–7 days"
    if x <= 28: return "8–28 days"
    if x <= 90: return "1–3 months"
    return "> 3 months"


def text(v):
    return "" if pd.isna(v) else str(v)


def num(v):
    return None if pd.isna(v) else float(v)


def main():
    e = pd.read_excel(XLSX, sheet_name="Experiments")
    r = pd.read_excel(XLSX, sheet_name="References")
    drawn = e[(e["In Tables 1–3"] == "yes") & (e["Include in figure"] == "yes")]

    rows = []
    for _, x in drawn.iterrows():
        dosing = dose_bin(x["Treatment duration (days)"])
        sheet_val = x.get("Dosing group")
        if isinstance(sheet_val, str) and sheet_val != dosing:
            raise SystemExit(f"ID {x['ID']}: dosing group in the workbook ({sheet_val}) does not match the duration ({dosing})")
        rows.append(dict(
            id=int(x["ID"]), compound=x["Compound"], cls=x["Drug class"], ref=int(x["Reference"]),
            species=str(x["Species"]).capitalize(), model=x["Model (as reported)"], modelGroup=x["Injury model (grouped)"],
            modelCat=x["Model category"], route=x["Route"], routeDetail=text(x["Route detail"]),
            dur=num(x["Treatment duration (days)"]), endpoint=num(x["Readout day"]),
            dosing=dosing, outcome=x["RGC outcome"]))

    refs = {}
    for _, x in r.iterrows():
        n = int(x["Ref."])
        refs[n] = dict(n=n, short=x["Citation"], authors=x["Authors"], title=x["Title"], journal=x["Journal"],
                       year=None if pd.isna(x["Year"]) else int(x["Year"]), doi=None if pd.isna(x["DOI"]) else x["DOI"],
                       full=x["Full reference (as in manuscript)"])
    used = sorted({row["ref"] for row in rows})
    missing = [n for n in used if n not in refs]
    if missing:
        raise SystemExit(f"References used by experiments but missing from the References sheet: {missing}")

    payload = json.dumps(dict(rows=rows, refs={n: refs[n] for n in used}), ensure_ascii=False)
    OUT.write_text(payload, encoding="utf-8")
    # the same data as a script, so src/page.html can be previewed straight from the folder
    (OUT.parent / "data.js").write_text("window.WHEEL_DATA = " + payload + ";\n", encoding="utf-8")
    print(f"Wrote data/data.json and data/data.js: {len(rows)} experiments, {len(used)} studies")
    for k in ("modelCat", "route", "dosing"):
        print(f"   {k}: " + ", ".join(f"{a} {b}" for a, b in Counter(x[k] for x in rows).most_common()))


if __name__ == "__main__":
    main()
