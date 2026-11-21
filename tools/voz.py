"""Voz del video con ElevenLabs: bloques encadenados (request stitching) + alineación forzada + QA.

  python -X utf8 tools/voz.py <slug>                 genera los bloques que faltan, arma vo.wav y vo.json
  python -X utf8 tools/voz.py <slug> --rehacer 3,5   rehace esos bloques (encadenados con sus vecinos)
  python -X utf8 tools/voz.py <slug> --armar         solo arma (sin gastar)
  python -X utf8 tools/voz.py <slug> --casting       mismo párrafo con las voces candidatas (casting/)

Lee videos/<slug>/guion.txt (# BLOQUE N separa bloques de voz) y config.json (raíz).
Deja en videos/<slug>/voz/: bNN.mp3 + bNN.json (request-id), vo.wav (-14 LUFS), vo.json:
  {"dur": s, "words": [{"w": mostrado, "s": ini, "e": fin, "line": i}], "lines": [{"s","e","text"}], "amp": [0..1 por frame a 30 fps]}
"""
import os, sys, json, re, subprocess, urllib.request, urllib.error, time, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "config.json"), encoding="utf-8"))
V = CFG["voz"]; KEY = os.environ["ELEVENLABS_API_KEY"]; API = "https://api.elevenlabs.io"
FPS = 30
TAG = re.compile(r"\[([^|\]]*)\|([^\]]*)\]")
AUDIO_TAG = re.compile(r"\{([^}]*)\}")   # {risita} -> [risita] solo para la voz, no se muestra


def parse(slug):
    """Devuelve bloques: [{"n", "lines": [{"raw","shown","spoken","tokens"}]}]"""
    blocks = []
    for raw in open(os.path.join(ROOT, "videos", slug, "guion.txt"), encoding="utf-8"):
        raw = raw.rstrip("\n")
        if raw.startswith("# BLOQUE"):
            blocks.append({"n": len(blocks) + 1, "title": raw[2:].strip(), "lines": []}); continue
        if not raw.strip() or raw.startswith("#"): continue
        if not blocks: blocks.append({"n": 1, "title": "BLOQUE 1", "lines": []})
        clean = AUDIO_TAG.sub("", raw).replace("  ", " ").strip()
        shown = TAG.sub(r"\1", clean)
        spoken_v = AUDIO_TAG.sub(lambda m: f"[{m.group(1)}]", TAG.sub(r"\2", raw))  # con audio tags
        spoken = TAG.sub(r"\2", clean).replace("*", "")   # *palabra clave*: solo se ve, no se lee
        spoken_v = spoken_v.replace("*", "")
        # tokens para subtítulos: (mostrado, nº de palabras habladas)
        toks = []; pos = 0
        for m in TAG.finditer(clean):
            for w in clean[pos:m.start()].split(): toks.append((w, 1))
            sw = m.group(2).split(); shw = m.group(1)
            # pegar puntuación que viene justo después del tag
            toks.append((shw, len(sw))); pos = m.end()
        for w in clean[pos:].split(): toks.append((w, 1))
        # fusionar puntuación suelta (".", ",") con el token anterior
        out = []
        for w, n in toks:
            if out and re.fullmatch(r"[.,;:!?¡¿]+", w): out[-1] = (out[-1][0] + w, out[-1][1])
            else: out.append((w, n))
        blocks[-1]["lines"].append({"shown": shown, "spoken": spoken, "spoken_v": spoken_v, "tokens": out})
    return blocks


def http(url, body=None, files=None, raw=False, method=None):
    h = {"xi-api-key": KEY}
    if body is not None and files is None:
        data = json.dumps(body).encode(); h["Content-Type"] = "application/json"
    else: data = None
    req = urllib.request.Request(url, data, h, method=method)
    for i in range(4):
        try:
            r = urllib.request.urlopen(req, timeout=300)
            return (r.read(), dict(r.headers)) if raw else json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:400]
            if e.code in (429, 500, 502, 503) and i < 3: time.sleep(5 * (i + 1)); continue
            raise SystemExit(f"HTTP {e.code}: {msg}")


def tts(text, prev_ids, next_ids, seed, voice=None, model=None, settings=None):
    voice = voice or V["voice_id"]; model = model or V["model_id"]
    body = {"text": text, "model_id": model, "voice_settings": settings or V["settings"], "seed": seed}
    if model.startswith("eleven_v4") or model.startswith("eleven_v3"): body["language_code"] = "es"
    if prev_ids: body["previous_request_ids"] = prev_ids[-3:]
    if next_ids: body["next_request_ids"] = next_ids[:3]
    if V.get("dict_id"): body["pronunciation_dictionary_locators"] = [{"pronunciation_dictionary_id": V["dict_id"], "version_id": V["dict_version"]}]
    audio, hdr = http(f"{API}/v1/text-to-speech/{voice}?output_format={V['formato']}", body, raw=True)
    rid = hdr.get("request-id") or hdr.get("Request-Id") or hdr.get("x-request-id")
    return audio, rid


def mp3_to_wav(src, dst):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", "44100", dst], check=True)


def armar(slug, blocks):
    D = os.path.join(ROOT, "videos", slug, "voz")
    gap = V.get("pausa_entre_bloques", 0.35)
    parts = []
    for b in blocks:
        mp3 = os.path.join(D, f"b{b['n']:02d}.mp3"); w = mp3[:-4] + ".wav"; mp3_to_wav(mp3, w)
        a, sr = read_wav(w)
        a = trim(a, sr)  # recorta silencio inicial/final, deja 60 ms
        parts.append(a)
    sr = 44100; sil = np.zeros(int(gap * sr), np.float32)
    full = []
    for i, p in enumerate(parts):
        f = int(0.012 * sr); p = p.copy(); p[:f] *= np.linspace(0, 1, f); p[-f:] *= np.linspace(1, 0, f)
        full.append(p)
        if i < len(parts) - 1: full.append(sil)
    lead = np.zeros(int(0.25 * sr), np.float32)
    a = np.concatenate([lead] + full + [np.zeros(int(0.6 * sr), np.float32)])
    raw = os.path.join(D, "vo_raw.wav"); write_wav(raw, a, sr)
    # postpro: paso alto, presencia, de-esser suave, compresión ligera, -14 LUFS (2 pasadas)
    chain = (f"atempo={V['tempo']}," if V.get("tempo", 1) != 1 else "") + "highpass=f=75,equalizer=f=250:t=q:w=1:g=-1.5,equalizer=f=4000:t=q:w=1:g=1.5,deesser=i=0.3,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2"
    meas = subprocess.run(["ffmpeg", "-hide_banner", "-i", raw, "-af", chain + ",loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
    ln = f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
    out = os.path.join(ROOT, "videos", slug, "vo.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", chain + "," + ln, "-ar", "48000", out], check=True)
    return out


def read_wav(p):
    with wave.open(p) as w:
        sr = w.getframerate(); n = w.getnframes(); ch = w.getnchannels()
        a = np.frombuffer(w.readframes(n), np.int16).astype(np.float32) / 32768
    if ch > 1: a = a.reshape(-1, ch).mean(1)
    return a, sr


def write_wav(p, a, sr):
    with wave.open(p, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())


def trim(a, sr, thr=0.01, keep=0.06):
    idx = np.where(np.abs(a) > thr)[0]
    if not len(idx): return a
    s = max(0, idx[0] - int(keep * sr)); e = min(len(a), idx[-1] + int(keep * sr))
    return a[s:e]


def align(slug, blocks):
    """Forced alignment de ElevenLabs sobre vo.wav con el texto hablado."""
    VD = os.path.join(ROOT, "videos", slug)
    text = "\n".join(l["spoken"] for b in blocks for l in b["lines"])
    import uuid
    bnd = uuid.uuid4().hex
    wavb = open(os.path.join(VD, "vo.wav"), "rb").read()
    body = (f"--{bnd}\r\nContent-Disposition: form-data; name=\"text\"\r\n\r\n{text}\r\n"
            f"--{bnd}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"vo.wav\"\r\nContent-Type: audio/wav\r\n\r\n").encode() + wavb + f"\r\n--{bnd}--\r\n".encode()
    req = urllib.request.Request(f"{API}/v1/forced-alignment", body, {"xi-api-key": KEY, "Content-Type": f"multipart/form-data; boundary={bnd}"})
    r = json.load(urllib.request.urlopen(req, timeout=600))
    json.dump(r, open(os.path.join(VD, "voz", "alignment.json"), "w", encoding="utf-8"), ensure_ascii=False)
    aw = [w for w in r["words"] if w["text"].strip() and re.search(r"\w", w["text"])]
    # repartir palabras alineadas a tokens mostrados
    words = []; lines = []; k = 0; li = 0
    for b in blocks:
        for l in b["lines"]:
            ls = None
            for shw, n in l["tokens"]:
                seg = aw[k:k + n]; k += n
                if not seg: continue
                s, e = seg[0]["start"], seg[-1]["end"]
                if ls is None: ls = s
                words.append({"w": shw, "s": round(s, 3), "e": round(e, 3), "line": li, "loss": round(max(x.get("loss", 0) for x in seg), 3)})
            lines.append({"s": ls, "e": words[-1]["e"], "text": l["shown"], "block": b["n"]}); li += 1
    if k != len(aw): print(f"AVISO: {len(aw)} palabras alineadas y {k} esperadas")
    print("loss global:", r.get("loss"))
    return words, lines


def amp_track(path, dur):
    a, sr = read_wav(path)
    hop = sr // FPS; n = int(dur * FPS) + 1; out = []
    for i in range(n):
        seg = a[i * hop:(i + 1) * hop]
        out.append(float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0)
    out = np.array(out); ref = np.percentile(out[out > 0.005], 90) if (out > 0.005).any() else 1
    return [round(float(x), 3) for x in np.clip(out / ref, 0, 1)]


def qa(slug, blocks):
    """Transcribe vo.wav con Scribe y compara contra el guion hablado."""
    VD = os.path.join(ROOT, "videos", slug)
    import uuid
    bnd = uuid.uuid4().hex; wavb = open(os.path.join(VD, "vo.wav"), "rb").read()
    body = (f"--{bnd}\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nscribe_v1\r\n"
            f"--{bnd}\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\nspa\r\n"
            f"--{bnd}\r\nContent-Disposition: form-data; name=\"tag_audio_events\"\r\n\r\ntrue\r\n"
            f"--{bnd}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"vo.wav\"\r\nContent-Type: audio/wav\r\n\r\n").encode() + wavb + f"\r\n--{bnd}--\r\n".encode()
    req = urllib.request.Request(f"{API}/v1/speech-to-text", body, {"xi-api-key": KEY, "Content-Type": f"multipart/form-data; boundary={bnd}"})
    r = json.load(urllib.request.urlopen(req, timeout=600))
    json.dump(r, open(os.path.join(VD, "voz", "qa_stt.json"), "w", encoding="utf-8"), ensure_ascii=False)
    norm = lambda s: re.sub(r"[^\wñáéíóúü ]", " ", s.lower()).split()
    ref = norm(" ".join(l["spoken"] for b in blocks for l in b["lines"]))
    hyp = [w for w in r["words"] if w["type"] == "word"]; hypn = [norm(w["text"]) for w in hyp]
    flat = []; tim = []
    for w, n in zip(hyp, hypn):
        for x in n: flat.append(x); tim.append(w["start"])
    import difflib
    sm = difflib.SequenceMatcher(None, ref, flat, autojunk=False); probs = []
    for op, a1, a2, b1, b2 in sm.get_opcodes():
        if op == "equal": continue
        t = tim[b1] if b1 < len(tim) else (tim[-1] if tim else 0)
        probs.append(f"{t:7.2f}s  {op:8s} guion: «{' '.join(ref[a1:a2])}»  audio: «{' '.join(flat[b1:b2])}»")
    events = [w for w in r["words"] if w["type"] == "audio_event"]
    rep = os.path.join(VD, "voz", "qa.txt")
    with open(rep, "w", encoding="utf-8") as f:
        f.write(f"Similitud: {sm.ratio():.4f}\n"); f.write("\n".join(probs) + "\n")
        for e in events: f.write(f"EVENTO {e['start']:.2f}s {e['text']}\n")
    print(f"QA similitud {sm.ratio():.4f} · {len(probs)} diferencias · {len(events)} eventos -> {rep}")
    for p in probs[:40]: print(" ", p)
    for e in events: print("  EVENTO", e["start"], e["text"])


def casting(slug, blocks):
    D = os.path.join(ROOT, "videos", slug, "casting"); os.makedirs(D, exist_ok=True)
    txt = " ".join(l["spoken_v"] for l in blocks[1]["lines"][:6])
    for vid, name in CFG["casting"]:
        p = os.path.join(D, f"{name}.mp3")
        if os.path.exists(p): continue
        a, _ = tts(txt, [], [], 7, voice=vid); open(p, "wb").write(a); print("casting", name)


def main():
    slug = sys.argv[1]; VD = os.path.join(ROOT, "videos", slug); D = os.path.join(VD, "voz"); os.makedirs(D, exist_ok=True)
    blocks = parse(slug)
    if "--casting" in sys.argv: casting(slug, blocks); return
    redo = set()
    if "--rehacer" in sys.argv: redo = {int(x) for x in sys.argv[sys.argv.index("--rehacer") + 1].split(",")}
    if "--armar" not in sys.argv:
        meta = lambda n: os.path.join(D, f"b{n:02d}.json")
        for b in blocks:
            n = b["n"]; text = "\n".join(l["spoken_v"] for l in b["lines"])
            old = json.load(open(meta(n), encoding="utf-8")) if os.path.exists(meta(n)) else None
            if old and old["text"] == text and n not in redo: continue
            prev = [json.load(open(meta(m), encoding="utf-8"))["rid"] for m in range(max(1, n - 3), n) if os.path.exists(meta(m))]
            nxt = []
            if n in redo and os.path.exists(meta(n + 1)): nxt = [json.load(open(meta(n + 1), encoding="utf-8"))["rid"]]
            seed = (old["seed"] + 101) if old else V["seed"]
            if old: os.replace(os.path.join(D, f"b{n:02d}.mp3"), os.path.join(D, f"b{n:02d}_v{old['seed']}.mp3"))
            audio, rid = tts(text, prev, nxt, seed)
            open(os.path.join(D, f"b{n:02d}.mp3"), "wb").write(audio)
            json.dump({"text": text, "rid": rid, "seed": seed, "t": time.time()}, open(meta(n), "w", encoding="utf-8"), ensure_ascii=False)
            print(f"bloque {n}: {len(text)} car · rid {rid}")
    nw = sum(len(l["spoken"].split()) for b in blocks for l in b["lines"])
    out = armar(slug, blocks)
    a, sr = read_wav(out); dur = len(a) / sr
    obj = V.get("ppm_objetivo")
    if obj:
        habla = dur - 0.85  # sin el silencio de entrada y salida
        ppm = nw / habla * 60
        if abs(ppm - obj) / obj > 0.02:
            V["tempo"] = round(min(1.3, max(0.85, V.get("tempo", 1) * obj / ppm)), 3)
            print(f"ppm {ppm:.0f} -> tempo {V['tempo']} para llegar a {obj}")
            out = armar(slug, blocks); a, sr = read_wav(out); dur = len(a) / sr
    words, lines = align(slug, blocks)
    json.dump({"dur": round(dur, 3), "words": words, "lines": lines, "amp": amp_track(out, dur)},
              open(os.path.join(VD, "vo.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(f"vo.wav {dur:.1f}s · {nw / (dur - 0.85) * 60:.0f} palabras/min (tempo {V.get('tempo', 1)})")
    sus = [w for w in words if w["loss"] > 1.2]
    for w in sus: print(f"  loss alto {w['s']:.2f}s «{w['w']}» {w['loss']}")
    if "--sinqa" not in sys.argv: qa(slug, blocks)


if __name__ == "__main__":
    main()
