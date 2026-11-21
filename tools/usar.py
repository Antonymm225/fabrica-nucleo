"""Copia el video <codigo> al motor: escenas.json, vo.json y la marca -> engine/src/video/; vo.wav -> engine/public/video/."""
import os, sys, json, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
slug = sys.argv[1]; V = os.path.join(ROOT, "videos", slug); E = os.path.join(ROOT, "engine")
os.makedirs(os.path.join(E, "src", "video"), exist_ok=True); os.makedirs(os.path.join(E, "public", "video"), exist_ok=True)
esc = json.load(open(os.path.join(V, "escenas.json"), encoding="utf-8"))
shutil.copy(os.path.join(V, "escenas.json"), os.path.join(E, "src", "video", "escenas.json"))
shutil.copy(os.path.join(V, "vo.json"), os.path.join(E, "src", "video", "vo.json"))
shutil.copy(os.path.join(ROOT, "marcas", esc["marca"] + ".json"), os.path.join(E, "src", "video", "marca.json"))
src, dst = os.path.join(V, "vo.wav"), os.path.join(E, "public", "video", "vo.wav")
if not os.path.exists(dst) or os.path.getmtime(src) > os.path.getmtime(dst): shutil.copy(src, dst)
print("usando", slug, "·", esc["marca"], "·", esc["estilo"])
