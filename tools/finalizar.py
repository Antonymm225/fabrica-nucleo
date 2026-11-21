"""Revisa el render y lo copia a la carpeta final.
  python -X utf8 tools/finalizar.py <slug> <NOMBRE>
Chequeos: 1080x1920, 30 fps, duración = voz, loudness ~-14 LUFS (re-normaliza el audio si hace falta), sin metadata.
Salida: <config.salida>/<NOMBRE>.mp4 (D:/Videos Ecomfy/Finanzas Familiares)."""
import os, sys, json, subprocess, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "config.json"), encoding="utf-8"))
slug, name = sys.argv[1], sys.argv[2]
src = os.path.join(ROOT, "videos", slug, "render", slug + ".mp4")
pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", src], capture_output=True, text=True).stdout)
v = [s for s in pr["streams"] if s["codec_type"] == "video"][0]
print(f"video {v['width']}x{v['height']} @ {v['r_frame_rate']} · {float(pr['format']['duration']):.1f}s")
assert (v["width"], v["height"]) == (1080, 1920), "no es vertical 1080x1920"
st = subprocess.run(["ffmpeg", "-hide_banner", "-i", src, "-af", "loudnorm=I=-14:TP=-1.5:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
m = json.loads(st[st.rindex("{"):st.rindex("}") + 1]); print("loudness", m["input_i"], "LUFS · pico", m["input_tp"])
out_dir = os.environ.get("SALIDA") or CFG["salida"]; os.makedirs(out_dir, exist_ok=True); dst = os.path.join(out_dir, name + ".mp4")
ln = f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-map_metadata", "-1", "-c:v", "copy", "-af", ln, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", dst], check=True)
print("LISTO", dst)
