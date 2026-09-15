import json, os, re, urllib.request, urllib.parse, time, sys, subprocess
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
BASE="https://www.remyshoots.co.za"
OUT="2026-09-15/assets"
man=open("2026-09-15/manifest.tsv","a")
def get(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest)>0: return True
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    req=urllib.request.Request(url, headers={"User-Agent":UA,"Accept":"*/*"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data=r.read(); ct=r.headers.get("content-type","")
        open(dest,"wb").write(data)
        man.write(f"{url}\t200\t{len(data)}\t{ct}\t{dest}\n"); man.flush()
        print("ok", len(data), dest); return True
    except Exception as e:
        man.write(f"{url}\tERR\t0\t{e}\t{dest}\n"); man.flush(); print("ERR", url, e); return False
props=json.load(open("projects.json"))
ps=props["projects"]
# images
imgmap={}
def local_for(u):
    if u.startswith("/api/sanity-image"):
        real=urllib.parse.parse_qs(urllib.parse.urlparse(u).query)["url"][0]
        name=os.path.basename(urllib.parse.urlparse(real).path)
        name=re.sub(r'\.(jpg|jpeg|png|webp)$','',name)+".webp"
        return real, f"{OUT}/images/projects/{name}"
    if u.startswith("https://image.mux.com"):
        pid=u.split("/")[3]
        return u, f"{OUT}/images/mux/{pid}.webp"
    return BASE+u, f"{OUT}{u}"
for p in ps:
    for u in [p["image"]]+p["gallery"]:
        real,dest=local_for(u); imgmap[u]=dest
        get(real,dest); time.sleep(0.15)
json.dump(imgmap,open("2026-09-15/imgmap.json","w"),indent=1)
# static
static=["/icons/playhead.svg","/icons/hand-open.svg","/icons/hand-closed.svg","/icons/hand-point.svg","/icons/cursor-arrow.svg","/tick.mp3","/videos/gesture-click.mp4","/videos/gesture-drag.mp4","/videos/gesture-view.mp4","/videos/sample.mp4","/images/carousel-1.webp","/images/carousel-2.webp","/images/carousel-3.webp","/images/carousel-4.webp","/images/carousel-5.webp","/images/studio-hero.jpg","/mediapipe/hand_landmarker.task","/favicon.ico","/apple-icon.png","/opengraph-image.png","/mediapipe/wasm/vision_wasm_internal.js","/mediapipe/wasm/vision_wasm_internal.wasm","/mediapipe/wasm/vision_wasm_nosimd_internal.js","/mediapipe/wasm/vision_wasm_nosimd_internal.wasm"]
for c in ["under-armour","nike","netflix","puma","vans","sony","levis","new-balance","redbull","vox-media","monster-energy","aston-martin","bloomberg","adidas"]:
    static.append(f"/icons/clients/{c}.svg")
for u in static:
    get(BASE+u, f"{OUT}{u}"); time.sleep(0.1)
# fonts
css=open("next/0gj70in27zsfq.css").read()
for f in sorted(set(re.findall(r'url\(\.\./media/([^)]+)\)',css))):
    get(f"{BASE}/_next/static/media/{f}", f"{OUT}/fonts/{f}"); time.sleep(0.1)
