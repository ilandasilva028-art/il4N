#!/usr/bin/env python3
"""End-to-end API test against a RUNNING stack (engine + API). Uses the owned test sample.

  python3 tests/test_api.py [http://127.0.0.1:8000]
Prints PASS/FAIL per check; exit 1 on any failure. Nothing is simulated: it drives the real engine.
"""
import json, os, sys, time, urllib.request, urllib.error

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000") + "/api"
SAMPLE = "/tmp/cliptest/sample_owned.mp4"
R = []


def check(name, ok, info=""):
    R.append(ok); print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}", flush=True)


def call(method, path, body=None, raw=False):
    data, headers = None, {}
    if body is not None:
        data, headers = json.dumps(body).encode(), {"Content-Type": "application/json"}
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            b = r.read()
            return r.status, (b if raw else json.loads(b or b"null"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


def upload(path, fields):
    import uuid
    bd = uuid.uuid4().hex
    parts = []
    for k, v in fields.items():
        parts.append(f"--{bd}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
    parts.append(f"--{bd}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{os.path.basename(path)}\"\r\n"
                 f"Content-Type: video/mp4\r\n\r\n".encode() + open(path, "rb").read() + b"\r\n")
    parts.append(f"--{bd}--\r\n".encode())
    req = urllib.request.Request(BASE + "/import", data=b"".join(parts), method="POST",
                                 headers={"Content-Type": f"multipart/form-data; boundary={bd}"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.status, json.loads(r.read())


def wait(cid, states, timeout=600):
    t = time.time()
    while time.time() - t < timeout:
        s, c = call("GET", f"/clips/{cid}")
        if c["state"] in states:
            return c
        time.sleep(3)
    return call("GET", f"/clips/{cid}")[1]


# 1 routes
for p in ("/health", "/overview", "/channels", "/clips", "/jobs", "/ready", "/stats", "/settings", "/events"):
    s, _ = call("GET", p)
    check(f"route GET {p}", s == 200, s)
s, _ = call("GET", "/clips/999999")
check("404 clip inconnu", s == 404)
s, b = call("POST", "/channels", {"name": "x!"})
check("validation stricte (nom de chaîne invalide)", s == 422)

# 2 import owned sample -> candidates -> analysis
_, before = call("GET", "/clips?creator=apitest")
s, b = upload(SAMPLE, {"creator": "apitest", "rights": "owned", "max_moments": "1", "url": "https://example.com/owned"})
check("import vidéo personnelle", s == 202, b)
cid = None
for _ in range(60):
    _, cl = call("GET", "/clips?creator=apitest")
    new = [c for c in cl if c["id"] not in {x["id"] for x in before}]
    if new:
        cid = new[0]["id"]; break
    time.sleep(2)
check("moment candidat créé", cid is not None, cid)
c = wait(cid, ("READY", "REJECTED", "FAILED"))
check("analyse + rendu automatique", c["state"] in ("READY", "REJECTED"), f"{c['state']} score={c['score']} {c.get('error') or ''}")

# 3 studio render with overrides + real progress
a = c["analysis"]["cut"]
params = {"start": a["start"], "end": min(a["start"] + 18, a["end"] + 5), "layout": "blur", "hook": "TEST STUDIO",
          "sub_y": 1250, "font_size": 80, "color": "#FFFFFF", "highlight": "#00FF88"}
s, b = call("POST", f"/clips/{cid}/render", params)
check("demande de rendu studio", s == 200, b)
seen = []
t = time.time()
while time.time() - t < 300:
    _, c = call("GET", f"/clips/{cid}")
    if c["state"] == "RENDERING" and c["progress"] is not None:
        seen.append(c["progress"])
    if c["state"] in ("READY", "FAILED"):
        break
    time.sleep(1)
check("progression réelle observée", len(set(seen)) >= 2, f"{len(seen)} mesures, max {max(seen) if seen else None}")
check("rendu studio terminé", c["state"] == "READY", c.get("error"))
meta = c.get("metadata") or {}
check("réglages appliqués au rendu final", meta.get("hook") == "TEST STUDIO" and abs(meta.get("duration_s", 0) - (params["end"] - params["start"])) < 1.5
      and meta.get("layout", {}).get("mode") == "blur", {k: meta.get(k) for k in ("hook", "duration_s")})

# 4 cancel during render
s, _ = call("POST", f"/clips/{cid}/render", {**params, "hook": "ANNULE"})
for _ in range(60):
    _, c = call("GET", f"/clips/{cid}")
    if c["state"] == "RENDERING":
        break
    time.sleep(0.5)
s, _ = call("POST", f"/clips/{cid}/cancel")
c = wait(cid, ("REJECTED", "READY", "FAILED"), 60)
check("annulation d'un rendu", c["state"] == "REJECTED", c.get("error"))
s, b = call("POST", f"/clips/{cid}/retry")
check("réessayer après annulation", s == 200 and b["state"] == "ANALYZED", b)
c = wait(cid, ("READY", "FAILED"), 300)
check("re-rendu après relance", c["state"] == "READY", c.get("error"))

# 5 review / description / download gates
s, _ = call("GET", f"/clips/{cid}/download", raw=True)
check("téléchargement bloqué avant acceptation", s == 403)
s, b = call("PATCH", f"/clips/{cid}/ready", {"description": "Texte\n\nCrédit : @apitest\n\n#a #b #c"})
check("description refusée sans 5 hashtags", s == 422, b)
s, _ = call("PATCH", f"/clips/{cid}/ready", {"title": "Mon titre", "description": "Texte vérifié\n\nCrédit : @apitest\n\n#a #b #c #d #e"})
check("description valide enregistrée", s == 200)
s, _ = call("POST", f"/clips/{cid}/review", {"decision": "approve"})
s, body = call("GET", f"/clips/{cid}/download", raw=True)
check("téléchargement MP4 après acceptation", s == 200 and len(body) > 100000 and body[4:8] == b"ftyp", f"{len(body)} octets")

# 6 discovered clip cannot be rendered / exported
_, disc = call("GET", "/clips?state=DISCOVERED&limit=1")
if disc:
    s, _ = call("POST", f"/clips/{disc[0]['id']}/render", params)
    check("rendu refusé pour une source non autorisée", s == 403)

# 7 no publishing route
_, spec = call("GET", "/openapi.json")
pub = [p for p in spec["paths"] if any(w in p for w in ("publish", "tiktok", "upload"))]
check("aucune route de publication", not pub, pub)

print(f"\n{sum(R)}/{len(R)} passed")
sys.exit(0 if all(R) else 1)
