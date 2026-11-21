"""Copia el video <codigo> al motor: escenas.json, vo.json y la marca -> engine/src/video/; vo.wav -> engine/public/video/.
Si escenas.json trae "visual": {"paleta": n}, usa esa paleta de la marca en lugar de los colores base."""
import os, sys, json, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
slug = sys.argv[1]; V = os.path.join(ROOT, "videos", slug); E = os.path.join(ROOT, "engine")
os.makedirs(os.path.join(E, "src", "video"), exist_ok=True); os.makedirs(os.path.join(E, "public", "video"), exist_ok=True)
esc = json.load(open(os.path.join(V, "escenas.json"), encoding="utf-8"))
shutil.copy(os.path.join(V, "escenas.json"), os.path.join(E, "src", "video", "escenas.json"))
shutil.copy(os.path.join(V, "vo.json"), os.path.join(E, "src", "video", "vo.json"))
marca = json.load(open(os.path.join(ROOT, "marcas", esc["marca"] + ".json"), encoding="utf-8"))
vis = esc.get("visual") or {}
pal = marca.get("paletas") or []
nombre = "base"
if pal and isinstance(vis.get("paleta"), int):
    p = pal[vis["paleta"] % len(pal)]; nombre = p.get("nombre", str(vis["paleta"]))
    marca["colores"] = {k: p[k] for k in ("fondo", "principal", "tinta", "gris", "acentos")}
json.dump(marca, open(os.path.join(E, "src", "video", "marca.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
src, dst = os.path.join(V, "vo.wav"), os.path.join(E, "public", "video", "vo.wav")
if not os.path.exists(dst) or os.path.getmtime(src) > os.path.getmtime(dst): shutil.copy(src, dst)
print("usando", slug, "·", esc["marca"], "·", esc["estilo"], "· paleta", nombre, "· fondo", vis.get("fondo", "cruces"), "· clave", vis.get("clave", "serif"))
