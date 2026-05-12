#!/usr/bin/env python3
# USE WHEN: bulk-importing many LottieFiles entries from a harvest manifest
# (.lottiefiles-harvest-manifest.json). Skips duplicates by content_hash.
"""
Usage: scripts/bulk-import-lottiefiles.py <manifest.json>

Manifest is a JSON array of {slug, asset, title, author, keywords}.
"""
import concurrent.futures as cf
import hashlib, io, json, os, re, sys, time, urllib.request, zipfile
from datetime import datetime, timezone
from pathlib import Path

if len(sys.argv) < 2:
    print("usage: bulk-import-lottiefiles.py <manifest.json>", file=sys.stderr)
    sys.exit(2)

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / "library"
LIB.mkdir(exist_ok=True)
manifest = json.loads(Path(sys.argv[1]).read_text())

# Build an existing-hash set so we can dedupe across reruns
existing_hashes: set[str] = set()
for d in LIB.iterdir():
    meta = d / "meta.json"
    if meta.exists():
        try:
            h = json.loads(meta.read_text()).get("content_hash")
            if h:
                existing_hashes.add(h)
        except Exception:
            pass

def slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")[:60] or "untitled"

def process(item: dict) -> dict:
    slug_id = item.get("slug") or ""
    page_url = f"https://lottiefiles.com/free-animation/{slug_id}"
    asset = item.get("asset")
    title = (item.get("title") or "Untitled").strip()
    author = (item.get("author") or "Unknown").strip()
    keywords = item.get("keywords") or []
    if not asset:
        return {"slug": slug_id, "ok": False, "reason": "no asset url"}

    try:
        req = urllib.request.Request(asset, headers={"User-Agent": "open-lottie-ui-import/1.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
    except Exception as e:
        return {"slug": slug_id, "ok": False, "reason": f"download failed: {e}"}

    try:
        zf = zipfile.ZipFile(io.BytesIO(raw))
    except zipfile.BadZipFile:
        return {"slug": slug_id, "ok": False, "reason": "bad zip"}

    anim_names = [n for n in zf.namelist() if n.startswith("animations/") and n.endswith(".json")]
    if not anim_names:
        return {"slug": slug_id, "ok": False, "reason": "no animation json"}
    anim_json = zf.read(anim_names[0])
    h = hashlib.sha256(anim_json).hexdigest()
    if h in existing_hashes:
        return {"slug": slug_id, "ok": True, "skipped": True, "hash": h[:6]}

    try:
        anim = json.loads(anim_json)
    except Exception as e:
        return {"slug": slug_id, "ok": False, "reason": f"bad animation json: {e}"}

    short = h[:6]
    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    base_slug = slugify(title) if title and title.lower() != "none" else slugify(slug_id)
    dir_name = f"{date}_{base_slug}_{short}"
    out = LIB / dir_name
    if out.exists():
        return {"slug": slug_id, "ok": True, "skipped": True, "reason": "dir exists"}
    out.mkdir(parents=True)

    (out / "animation.json").write_bytes(anim_json)
    (out / "source.lottie").write_bytes(raw)
    img_dir = out / "images"
    for n in zf.namelist():
        if n.startswith("images/"):
            img_dir.mkdir(exist_ok=True)
            (out / n).write_bytes(zf.read(n))

    tags = sorted(set(["lottiefiles-import"] + keywords))
    meta = {
        "id": dir_name,
        "slug": base_slug,
        "title": title,
        "tags": tags,
        "source": "lottiefiles",
        "source_url": page_url,
        "asset_url": asset,
        "author": author,
        "license_id": "LottieSimpleLicense",
        "license_url": "https://lottiefiles.com/page/license",
        "attribution_required": True,
        "attribution_text": f"Animation by {author} on LottieFiles",
        "imported_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "imported_by": "bulk-import-lottiefiles.py",
        "content_hash": f"sha256:{h}",
        "intrinsic": {
            "fr": anim.get("fr", 0),
            "ip": anim.get("ip", 0),
            "op": anim.get("op", 0),
            "w": anim.get("w", 0),
            "h": anim.get("h", 0),
            "layer_count": len(anim.get("layers") or []),
            "size_bytes": len(anim_json),
        },
        "from_generation": None,
    }
    (out / "meta.json").write_text(json.dumps(meta, indent=2))
    existing_hashes.add(h)
    return {"slug": slug_id, "ok": True, "dir": dir_name, "title": title, "author": author, "kws": keywords}

start = time.time()
ok = skipped = failed = 0
results = []
with cf.ThreadPoolExecutor(max_workers=8) as ex:
    for i, res in enumerate(ex.map(process, manifest), 1):
        results.append(res)
        if not res.get("ok"):
            failed += 1
            print(f"[{i}/{len(manifest)}] FAIL {res['slug']}: {res.get('reason')}", file=sys.stderr)
        elif res.get("skipped"):
            skipped += 1
        else:
            ok += 1
            print(f"[{i}/{len(manifest)}] {res.get('dir')}")
elapsed = time.time() - start
print(f"\nDone in {elapsed:.1f}s — ok={ok}, skipped={skipped}, failed={failed}")
(ROOT / ".lottiefiles-harvest-results.json").write_text(json.dumps(results, indent=2))
