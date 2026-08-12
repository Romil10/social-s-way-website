#!/usr/bin/env python3
"""Build a publish-ready start.html with the main site's absolute URL."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAIN_SITE = "https://pub.hyperagent.com/p/yBsaWDzA2DsiwykR48dbl7dwRcr2ZntwQA1cIZRcJwI"

html = (ROOT / "start.html").read_text()
# Replace relative index.html links with the absolute public main-site URL
n = html.count('href="index.html"')
html = html.replace('href="index.html"', f'href="{MAIN_SITE}"')
# start.html self-link stays relative -> make it absolute too (self)
# Actually start.html on the published host is the pub URL; keep the Contact
# link pointing to the same page (it's a no-op self-link, which is fine).
out = ROOT / "start.public.html"
out.write_text(html)
print(f"replaced {n} index.html links -> {MAIN_SITE}")
print(f"wrote {out}")
