# Ping IndexNow with all sitemap URLs (runs in GitHub Actions on push).
import re, json, urllib.request

urls = re.findall(r"<loc>([^<]+)</loc>", open("sitemap.xml", encoding="utf-8").read())
body = json.dumps({
    "host": "fqadulting.com",
    "key": "300404e4285b53927c997bd1efc2cb7b",
    "keyLocation": "https://fqadulting.com/300404e4285b53927c997bd1efc2cb7b.txt",
    "urlList": urls,
}).encode("utf-8")
req = urllib.request.Request(
    "https://api.indexnow.org/indexnow", data=body,
    headers={"Content-Type": "application/json; charset=utf-8"},
)
try:
    print("IndexNow:", urllib.request.urlopen(req, timeout=20).status, "·", len(urls), "urls")
except Exception as e:
    print("IndexNow ping failed (non-fatal):", e)
