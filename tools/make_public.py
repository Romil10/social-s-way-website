#!/usr/bin/env python3
"""Build a publish-ready index.html with absolute asset URLs."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

MAP = {
    "css/styles.css": "https://pub.hyperagent.com/api/published/pbf01KZR1H50E_JZ2V62PYSHE3D10J/styles.css?v=14",
    "js/app.js": "https://pub.hyperagent.com/api/published/pbf01KZR1H50B_15WMK0YHXA5B0SP8/app.js?v=8",
    "start.html": "https://pub.hyperagent.com/p/tkHuXIjCF4bXYLVghR2Cyuu5a68WuK03cxF5WvUsbyA",
    "assets/layers/bg-00-1x.webp": "https://pub.hyperagent.com/api/published/pbf01KZR1FF8H_NHCMDNFXKC0EJG3P/bg-00-1x.webp?v=3",
    "assets/layers/bg-00-2x.webp": "https://pub.hyperagent.com/api/published/pbf01KZR1KB4R_A4CFVX8A8TQE681B/bg-00-2x.webp?v=3",
    "assets/layers/mid-20-1x.webp": "https://pub.hyperagent.com/api/published/pbf01KZR1KB2M_5E7XYTX9GFZPGHQJ/mid-20-1x.webp?v=4",
    "assets/layers/mid-20-2x.webp": "https://pub.hyperagent.com/api/published/pbf01KZR1KB0T_BGN39WKRQGD20BX4/mid-20-2x.webp?v=4",
    "assets/layers/hero-30-1x.webp": "https://pub.hyperagent.com/api/published/pbf01KZR1KB39_7YPJ0HW0Q034EV5J/hero-30-1x.webp?v=4",
    "assets/layers/hero-30-2x.webp": "https://pub.hyperagent.com/api/published/pbf01KZR1KB2Y_ZRSARN9KZSWEQ691/hero-30-2x.webp?v=4",
    "assets/layers/40-door-left-1x.webp": "https://pub.hyperagent.com/api/published/pbf01KZR1KB29_RAP4DH03SMGBBGPX/40-door-left-1x.webp",
    "assets/layers/40-door-left-2x.webp": "https://pub.hyperagent.com/api/published/pbf01KZR1KB26_HZPQTBWHT6DA4XAK/40-door-left-2x.webp",
    "assets/layers/41-door-right-1x.webp": "https://pub.hyperagent.com/api/published/pbf01KZR1KB23_5G3RZCCCKBC35JWE/41-door-right-1x.webp",
    "assets/layers/41-door-right-2x.webp": "https://pub.hyperagent.com/api/published/pbf01KZR1KB2S_EA6VBFZD199QC0CP/41-door-right-2x.webp",
    "assets/cards/brand-strategy.webp": "https://pub.hyperagent.com/api/published/pbf01KZR1KB4S_1CDEDQYTPZZQY099/brand-strategy.webp",
    "assets/cards/identity-design.webp": "https://pub.hyperagent.com/api/published/pbf01KZR1KB6D_9W0YJS4WHECER154/identity-design.webp",
    "assets/cards/content-editorial.webp": "https://pub.hyperagent.com/api/published/pbf01KZR1KB48_5DQE2HENK4QDST60/content-editorial.webp",
    "assets/cards/social-campaigns.webp": "https://pub.hyperagent.com/api/published/pbf01KZR1KB56_T14T2HXQNMK5TR16/social-campaigns.webp",
    "assets/cards/web-digital.webp": "https://pub.hyperagent.com/api/published/pbf01KZR1KB22_HXDGWW2Q33CJMX0Z/web-digital.webp",
    "assets/cards/research-insight.webp": "https://pub.hyperagent.com/api/published/pbf01KZR1KB2X_M9RPHF9E9A0NJWY4/research-insight.webp",
    "assets/work/goa.mp4": "https://pub.hyperagent.com/api/published/pbf01KZRV89K2_TWSH7EFY84YS04NF/goa.mp4",
    "assets/work/infiniti.mp4": "https://pub.hyperagent.com/api/published/pbf01KZRV89K9_WKN27DBX5DZDFW53/infiniti.mp4",
    "assets/work/piano.mp4": "https://pub.hyperagent.com/api/published/pbf01KZRV89K3_1M5E8DFXD08BP418/piano.mp4",
    "assets/work/music.mp4": "https://pub.hyperagent.com/api/published/pbf01KZRV89KA_JJ9HA1CAFX3KHZGM/music.mp4",
    "assets/work/goa.webp": "https://pub.hyperagent.com/api/published/pbf01KZRV89KB_0TZDQ129HB4GC8VA/goa.webp",
    "assets/work/infiniti.webp": "https://pub.hyperagent.com/api/published/pbf01KZRV89K4_CSX2CYNAVQDJ1R8V/infiniti.webp",
    "assets/work/piano.webp": "https://pub.hyperagent.com/api/published/pbf01KZRV89KV_AQHANF0773RCVAX9/piano.webp",
    "assets/work/music.webp": "https://pub.hyperagent.com/api/published/pbf01KZRV89K2_RW2F23P5XY18XBYB/music.webp",
    "assets/work/procuta.webp": "https://pub.hyperagent.com/api/published/pbf01KZRV89K2_A292HY19MA4CDBC8/procuta.webp",
    "assets/work/surguja.webp": "https://pub.hyperagent.com/api/published/pbf01KZRV89K9_7T853GFP75WFVK2D/surguja.webp",
    "assets/work/bioskinsy.mp4": "https://pub.hyperagent.com/api/published/pbf01KZRZNTS9_V9ZFFAAADDMVRXQJ/bioskinsy.mp4",
    "assets/work/bioskinsy.webp": "https://pub.hyperagent.com/api/published/pbf01KZRZNTSM_SDZ24CFV23337NN6/bioskinsy.webp",
}

html = (ROOT / "index.html").read_text()
for rel, url in MAP.items():
    n = html.count(rel)
    html = html.replace(rel, url)
    print(f"{n:2d}x  {rel}")

out = ROOT / "index.public.html"
out.write_text(html)
leftover = [k for k in MAP if k in html]
print("leftover relative refs:", leftover if leftover else "none")
print("wrote", out)
