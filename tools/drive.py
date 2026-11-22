"""Sube los MP4 terminados a Google Drive, ordenados: Fábrica de Videos / <Marca> / <año-mes> / <código> - <título>.mp4

Uso: python tools/drive.py <carpeta con los mp4>
Necesita los Secrets GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET y GDRIVE_REFRESH_TOKEN (permiso drive.file:
solo ve y toca lo que esta fábrica sube). Si ya existe un archivo con el mismo nombre, lo reemplaza.
"""
import datetime, glob, json, os, re, sys, urllib.error, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAIZ = "Fábrica de Videos"
API = "https://www.googleapis.com/drive/v3/files"
SUBIR = "https://www.googleapis.com/upload/drive/v3/files"
CARPETA = "application/vnd.google-apps.folder"


def pedir(url, data=None, headers=None, method=None):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        cuerpo = e.read().decode("utf-8", "replace")[:600]
        raise RuntimeError(f"Google respondió {e.code}: {cuerpo}") from None


def token():
    datos = urllib.parse.urlencode({
        "client_id": os.environ["GDRIVE_CLIENT_ID"], "client_secret": os.environ["GDRIVE_CLIENT_SECRET"],
        "refresh_token": os.environ["GDRIVE_REFRESH_TOKEN"], "grant_type": "refresh_token"}).encode()
    _, _, b = pedir("https://oauth2.googleapis.com/token", datos)
    return json.loads(b)["access_token"]


def buscar(tk, nombre, padre, carpeta):
    q = "name = '{}' and '{}' in parents and trashed = false and mimeType {} '{}'".format(
        nombre.replace("\\", "\\\\").replace("'", "\\'"), padre, "=" if carpeta else "!=", CARPETA)
    url = API + "?" + urllib.parse.urlencode({"q": q, "fields": "files(id,name,webViewLink)", "pageSize": 5})
    _, _, b = pedir(url, headers={"Authorization": "Bearer " + tk})
    fs = json.loads(b).get("files", [])
    return fs[0] if fs else None


def carpeta(tk, nombre, padre="root"):
    f = buscar(tk, nombre, padre, True)
    if f: return f["id"]
    cuerpo = json.dumps({"name": nombre, "mimeType": CARPETA, "parents": [padre]}).encode()
    _, _, b = pedir(API + "?fields=id", cuerpo, {"Authorization": "Bearer " + tk, "Content-Type": "application/json"})
    return json.loads(b)["id"]


def subir(tk, ruta, nombre, padre):
    viejo = buscar(tk, nombre, padre, False)
    cab = {"Authorization": "Bearer " + tk, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4"}
    if viejo:   # mismo nombre: se reemplaza el contenido, no se duplica
        _, h, _ = pedir(f"{SUBIR}/{viejo['id']}?uploadType=resumable&fields=id,webViewLink", b"{}", cab, "PATCH")
    else:
        _, h, _ = pedir(SUBIR + "?uploadType=resumable&fields=id,webViewLink", json.dumps({"name": nombre, "parents": [padre]}).encode(), cab, "POST")
    sesion = next(v for k, v in h.items() if k.lower() == "location")
    datos = open(ruta, "rb").read()
    _, _, b = pedir(sesion, datos, {"Content-Type": "video/mp4", "Content-Length": str(len(datos))}, "PUT")
    return json.loads(b).get("webViewLink", ""), bool(viejo)


def limpio(s):
    return re.sub(r"\s+", " ", re.sub(r'[\\/:*?"<>|]', " ", s)).strip()[:90]


def datos_de(cod):
    """Marca, título y si lleva IUL, leídos del repo."""
    pref = cod.rsplit("-", 1)[0]
    marca = pref
    for m in glob.glob(os.path.join(ROOT, "marcas", "*.json")):
        j = json.load(open(m, encoding="utf-8"))
        if j.get("codigo") == pref: marca = j.get("nombre", pref)
    titulo, iul = "", False
    g = os.path.join(ROOT, "videos", cod, "guion.txt")
    if os.path.exists(g):
        prim = open(g, encoding="utf-8").readline().strip()
        if "·" in prim: titulo = prim.split("·")[-1].strip()
    e = os.path.join(ROOT, "videos", cod, "escenas.json")
    if os.path.exists(e):
        j = json.load(open(e, encoding="utf-8"))
        iul = bool(isinstance(j, dict) and j.get("con_iul"))
    return marca, titulo, iul


def main():
    faltan = [k for k in ("GDRIVE_CLIENT_ID", "GDRIVE_CLIENT_SECRET", "GDRIVE_REFRESH_TOKEN") if not os.environ.get(k)]
    if faltan:
        print("::warning::No se subió a Drive: faltan los Secrets " + ", ".join(faltan)); return 0
    mp4 = sorted(glob.glob(os.path.join(sys.argv[1], "**", "*.mp4"), recursive=True))
    if not mp4:
        print("No hay videos para subir."); return 0
    tk = token()
    raiz = carpeta(tk, RAIZ)
    mes = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m")
    cache, lineas, fallos = {}, [], 0
    for ruta in mp4:
        cod = os.path.splitext(os.path.basename(ruta))[0]
        try:
            marca, titulo, iul = datos_de(cod)
            if marca not in cache: cache[marca] = carpeta(tk, mes, carpeta(tk, limpio(marca), raiz))
            nombre = limpio(f"{cod} - {'(IUL) ' if iul else ''}{titulo}".rstrip(" -")) + ".mp4"
            link, reemplazo = subir(tk, ruta, nombre, cache[marca])
            print(f"{cod}: {'reemplazado' if reemplazo else 'subido'} en {RAIZ}/{marca}/{mes}/{nombre}")
            lineas.append(f"- [{nombre}]({link}) · {RAIZ} / {marca} / {mes}")
        except Exception as x:
            fallos += 1
            print(f"::error::{cod} no se pudo subir a Drive: {x}")
    resumen = os.environ.get("GITHUB_STEP_SUMMARY")
    if resumen and lineas:
        open(resumen, "a", encoding="utf-8").write("## Videos en Google Drive\n" + "\n".join(lineas) + "\n")
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(main())
