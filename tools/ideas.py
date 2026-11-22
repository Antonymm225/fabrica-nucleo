"""La lista de ideas vive en una hoja privada de Google Sheets ("Ideas de videos", dentro de "Fábrica de Videos").

El equipo escribe ahí qué video se hace (temática, gancho, si lleva IUL). La fábrica solo toma la siguiente
idea pendiente, la marca "en proceso", la desarrolla y la deja "hecho" con su video y su enlace.
Nada de la hoja se imprime en los registros (que son públicos): solo el número de fila.

Uso suelto: python tools/ideas.py crear   (crea la hoja si no existe)
"""
import datetime, json, os, re, sys, urllib.parse

from drive import API, RAIZ, carpeta, pedir, token

NOMBRE = "Ideas de videos"
HOJA = "application/vnd.google-apps.spreadsheet"
SHEETS = "https://sheets.googleapis.com/v4/spreadsheets"
COLS = ["id", "tematica", "gancho", "iul", "beneficio_iul", "marca", "estado", "tomada_por", "video", "fecha", "link", "notas"]
AYUDA = ["(número)", "De qué va el video, en una frase", "Opcional: cómo abre", "sí / no (vacío = la fábrica decide por el tema)",
         "Opcional: retiro / protección / en vida", "Opcional: solo para esta marca", "pendiente", "", "", "", "", ""]
BENEFICIOS = [("ahorro para el retiro", r"retir|ahorr|jubil"), ("protección de la familia si tú faltas", r"protec|famil|falt|funeral|muert"),
              ("beneficios en vida si te enfermas", r"en vida|enferm|incapac|accident")]


def activa():
    return all(os.environ.get(k) for k in ("GDRIVE_CLIENT_ID", "GDRIVE_CLIENT_SECRET", "GDRIVE_REFRESH_TOKEN"))


def _cab(tk):
    return {"Authorization": "Bearer " + tk, "Content-Type": "application/json"}


def hoja(tk, crear=False):
    raiz = carpeta(tk, RAIZ)
    q = f"name = '{NOMBRE}' and '{raiz}' in parents and trashed = false and mimeType = '{HOJA}'"
    _, _, b = pedir(API + "?" + urllib.parse.urlencode({"q": q, "fields": "files(id)"}), headers=_cab(tk))
    fs = json.loads(b).get("files", [])
    if fs: return fs[0]["id"]
    if not crear: return None
    _, _, b = pedir(API + "?fields=id", json.dumps({"name": NOMBRE, "mimeType": HOJA, "parents": [raiz]}).encode(), _cab(tk))
    sid = json.loads(b)["id"]
    poner(tk, sid, "A1:L2", [COLS, AYUDA])
    return sid


def poner(tk, sid, rango, valores):
    url = f"{SHEETS}/{sid}/values/{urllib.parse.quote(rango)}?valueInputOption=RAW"
    pedir(url, json.dumps({"values": valores}).encode(), _cab(tk), "PUT")


def filas(tk, sid):
    _, _, b = pedir(f"{SHEETS}/{sid}/values/A3:L", headers=_cab(tk))
    out = []
    for i, r in enumerate(json.loads(b).get("values", [])):
        r = [str(x).strip() for x in r] + [""] * (len(COLS) - len(r))
        d = dict(zip(COLS, r)); d["fila"] = i + 3
        out.append(d)
    return out


def _es(marca, texto):
    t = texto.lower()
    return not t or t in (marca.get("nombre", "").lower(), marca.get("codigo", "").lower(), marca.get("slug", "").lower())


def tomar(marca, cod):
    """La siguiente idea pendiente para esta marca, ya marcada 'en proceso'. None si no hay."""
    tk = token(); sid = hoja(tk)
    if not sid: return None
    for d in filas(tk, sid):
        if d["tematica"] and d["estado"].lower() in ("", "pendiente") and _es(marca, d["marca"]):
            hoy = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
            poner(tk, sid, f"G{d['fila']}:J{d['fila']}", [["en proceso", marca.get("nombre", ""), cod, hoy]])
            t = (d["tematica"] + " " + d["gancho"]).lower()
            s = d["iul"].lower()
            d["con_iul"] = s.startswith(("s", "x", "1", "t")) if s else bool(re.search(r"\biul\b|seguro de vida", t))
            d["beneficio"] = None
            if d["con_iul"]:
                b = (d["beneficio_iul"] or t).lower()
                d["beneficio"] = next((n for n, rx in BENEFICIOS if re.search(rx, b)), BENEFICIOS[1][0])
            return d
    return None


def marcar(fila, estado, nota=None):
    tk = token(); sid = hoja(tk)
    if not sid: return
    poner(tk, sid, f"G{fila}", [[estado]])
    if nota: poner(tk, sid, f"L{fila}", [[str(nota)[:300]]])


def enlazar(cod, link):
    """Anota el enlace de Drive en la fila del video (la llama la subida a Drive)."""
    tk = token(); sid = hoja(tk)
    if not sid: return
    for d in filas(tk, sid):
        if d["video"] == cod: poner(tk, sid, f"K{d['fila']}", [[link]])


if __name__ == "__main__":
    if not activa(): print("::warning::Faltan los Secrets de Google: no se tocó la hoja de ideas"); sys.exit(0)
    tk = token(); sid = hoja(tk, crear=True)
    print("Hoja de ideas lista:", len(filas(tk, sid)), "filas")
