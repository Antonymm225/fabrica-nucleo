"""Guionista de la fábrica: Claude (por API) elige e investiga el tema, escribe el guion y las escenas.
Una revisión sin IA comprueba cifras, reglas y escenas; si algo falla, Claude lo corrige una vez.

  python -X utf8 tools/producir.py --marca finanzas-familiares --cantidad 1
  python -X utf8 tools/producir.py --revisar FF-001          (solo revisa un video ya escrito, sin gastar)

Deja por video: videos/<CÓDIGO>/tema.json, guion.txt, escenas.json.
Escribe en $GITHUB_OUTPUT: lista=["FF-003", ...] con los que pasaron la revisión.
Necesita ANTHROPIC_API_KEY (Secret en GitHub)."""
import os, re, sys, json, ast, operator, glob, argparse, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELO = "claude-sonnet-5-5"
TAG = re.compile(r"\[([^|\]]*)\|([^\]]*)\]")
OBJETOS = {"tarjeta", "alcancia", "casa", "troca", "escuela", "banco", "calendario", "billete", "moneda", "cartera", "tienda", "hospital", "familia"}
TIPOS = {"cifra", "armar", "tablero", "oscura", "cierre", "lienzo"}
ELEMENTOS = {"persona", "objeto", "torre", "cifra", "texto", "globo", "recibo", "celular", "lista", "grafica", "dinero", "flecha", "tacha", "sello", "check"}
PROHIBIDO = [r"garantiz", r"sin riesgo", r"libre de impuestos", r"hazte rico", r"link en (mi|el) perfil", r"agenda", r"cotiza",
             r"\bvos\b", r"\btenés\b", r"\bcomentá\b", r"criptomoneda", r"bitcoin", r"acciones de", r"\bplata\b", r"\blana\b", r"\bguita\b",
             r"cooperativa", r"seguro de (auto|carro|troca)", r"promesa"]
LINEAS, PALABRAS = (26, 42), (170, 300)   # 50 a 88 segundos a 205 palabras por minuto
FONDOS = ["cruces", "puntos", "rayas", "cuadricula", "liso"]


def con_iul(cod):
    """4 de cada 10 videos llevan el IUL (los que terminan en 1, 3, 6 y 8)."""
    return int(cod.rsplit("-", 1)[1]) % 5 in (1, 3)


def visual_de(cod):
    """Paleta, fondo y letra de la palabra clave cambian de un video a otro."""
    n = int(cod.rsplit("-", 1)[1])
    return {"paleta": n % 6, "fondo": FONDOS[n % 5], "clave": ["serif", "negra"][(n // 2) % 2]}


DATOS_IUL = [
    {"dato": "Crecimiento del IUL: decir siempre 'hasta un 10% al año'", "valor": 10, "unidad": "%", "fuente": "https://interno/regla-de-la-marca-iul"},
    {"dato": "Piso del IUL: no pierde por la caída del mercado", "valor": 0, "unidad": "%", "fuente": "https://interno/regla-de-la-marca-iul"},
    {"dato": "Retiro: 'podrías llegar hasta medio millón'", "valor": 500000, "unidad": "$", "fuente": "https://interno/regla-de-la-marca-iul"},
]
REFS = {"en", "desde", "hasta", "armado", "elegir", "alcancia", "seguir", "compartir", "sale"}


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9$%]", "", s)


def leer(p):
    return open(os.path.join(ROOT, p), encoding="utf-8").read()


# ---------------------------------------------------------------- cuentas seguras
_OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv,
        ast.Pow: operator.pow, ast.USub: operator.neg, ast.UAdd: operator.pos, ast.FloorDiv: operator.floordiv}


def calcular(expr):
    """Evalúa solo aritmética (números, + - * / ** ( ) y round/min/max). Nada más."""
    def ev(n):
        if isinstance(n, ast.Expression): return ev(n.body)
        if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)): return n.value
        if isinstance(n, ast.BinOp) and type(n.op) in _OPS: return _OPS[type(n.op)](ev(n.left), ev(n.right))
        if isinstance(n, ast.UnaryOp) and type(n.op) in _OPS: return _OPS[type(n.op)](ev(n.operand))
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in ("round", "min", "max", "abs") and not n.keywords:
            return {"round": round, "min": min, "max": max, "abs": abs}[n.func.id](*[ev(a) for a in n.args])
        raise ValueError("expresión no permitida")
    if len(expr) > 300: raise ValueError("expresión muy larga")
    return float(ev(ast.parse(expr, mode="eval")))


def permitidos(ficha):
    """Cifras autorizadas: datos con fuente + cálculos verificados con Python."""
    nums, errores = [], []
    for d in ficha.get("datos", []):
        try: nums.append(float(d["valor"]))
        except Exception: errores.append(f"dato sin valor numérico: {d}")
        if not str(d.get("fuente", "")).startswith("http"): errores.append(f"dato sin enlace de fuente: {d.get('dato')}")
    for c in ficha.get("calculos", []):
        try:
            r = calcular(c["expresion"])
            if abs(r - float(c["resultado"])) > max(0.02, abs(r) * 0.001):
                errores.append(f"cálculo mal hecho: {c['descripcion']}: {c['expresion']} da {r:.2f}, no {c['resultado']}")
            nums.append(r)
        except Exception as e:
            errores.append(f"cálculo inválido ({c.get('expresion')}): {e}")
    return nums, errores


# ---------------------------------------------------------------- acomodo del lienzo (mismas medidas que engine/src/lienzo.tsx)
W_, Y0_, AH_ = 1080, 520, 1260


def _wrap(t, mx):
    out, cur = [], ""
    for w in str(t).split():
        if len((cur + " " + w).strip()) > mx and cur: out.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
    return out + ([cur] if cur else [])


def caja(e):
    """Rectángulo (x1, y1, x2, y2) en píxeles que ocupa un elemento del lienzo, o None si no ocupa lugar fijo."""
    q, tam = e.get("que"), e.get("tam")
    x, y = W_ * (e.get("x", 50) / 100), Y0_ + AH_ * (e.get("y", 50) / 100)
    if q == "persona":
        h = AH_ * (tam or 34) / 100; hw = h * 0.34; c = (x - hw, y - h * 0.95, x + hw, y + (80 if e.get("etiqueta") else 10))
    elif q == "objeto":
        w = W_ * (tam or 30) / 100; hw = w / 2; c = (x - hw, y - w * 0.45, x + hw, y + w * 0.45 + (80 if e.get("etiqueta") else 0))
    elif q == "torre":
        prop = min(1, e["valor"] / e["max"]) if e.get("max") and isinstance(e.get("valor"), (int, float)) else 1
        hw = 100; c = (x - hw, y - AH_ * (tam or 45) / 100 * prop - 110, x + hw, y + (75 if e.get("etiqueta") else 10))
    elif q == "cifra":
        txt = e.get("texto") or ((e.get("prefijo") or "") + f"{e.get('valor', 0):,.0f}" + (e.get("sufijo") or ""))
        fs = min(AH_ * (tam or 13) / 100, W_ * 0.9 / max(1, len(txt) * 0.66)); hw = len(txt) * fs * 0.66 / 2
        c = (x - hw, y - fs * 0.8, x + hw, y + (fs * 0.35 + 45 if e.get("etiqueta") else fs * 0.15))
    elif q == "texto":
        fs = AH_ * (tam or 4.5) / 100; L = _wrap(e.get("texto", ""), e.get("ancho", 18)) or [""]
        hw = max(len(l) for l in L) * fs * 0.56 / 2; c = (x - hw, y - fs, x + hw, y + (len(L) - 1) * fs * 1.1 + fs * 0.3)
    elif q == "globo":
        w = W_ * (tam or 74) / 100; hw = w / 2; h = len(_wrap(e.get("texto", ""), 22)) * 58 * 1.2 + 80; c = (x - hw, y - h / 2, x + hw, y + h / 2 + 70)
    elif q == "recibo":
        w = W_ * (tam or 80) / 100; hw = w / 2; h = 150 + len(e.get("renglones", [])) * 96 + (120 if e.get("total") else 0) + 22; c = (x - hw, y, x + hw, y + h)
    elif q == "celular":
        h = AH_ * (tam or 62) / 100; hw = h / 4; c = (x - hw, y - h / 2, x + hw, y + h / 2)
    elif q == "lista":
        w = W_ * (tam or 84) / 100; hw = w / 2; c = (x - hw, y, x + hw, y + len(e.get("items", [])) * 150 + 90)
    elif q == "grafica":
        w = W_ * (tam or 84) / 100; hw = w / 2; c = (x - hw, y - AH_ * 0.5 - 170, x + hw, y + (120 if e.get("etiqueta") else 70))
    elif q == "sello":
        w = W_ * (tam or 66) / 100; hw = w / 2; c = (x - hw, y - w * 0.2, x + hw, y + w * 0.2)
    elif q == "check":
        hw = 85; c = (x - hw, y - hw, x + hw, y + hw)
    else:
        return None
    et = str(e.get("etiqueta") or "")
    if et and q in ("persona", "objeto", "torre", "cifra"):
        ancho = len(et) * {"persona": 34, "objeto": 32, "torre": 30, "cifra": 30}[q] * (0.78 if q == "cifra" else 0.66) + 48
        if ancho / 2 > hw: c = (x - ancho / 2, c[1], x + ancho / 2, c[3])
    # el motor corre el elemento para que no se salga por los lados: aquí igual
    corr = 0
    if c[0] < 24: corr = 24 - c[0]
    elif c[2] > W_ - 24: corr = (W_ - 24) - c[2]
    return (c[0] + corr, c[1], c[2] + corr, c[3])


ENCIMA_OK = {"sello", "check"}          # se ponen encima a propósito...
DEBAJO_OK = {"objeto", "recibo", "celular"}   # ...solo de estas cosas


def acomodo(els, d):
    """Errores de acomodo de un lienzo: cosas encimadas o fuera del área de dibujo."""
    err, cajas = [], []
    for j, e in enumerate(els):
        c = caja(e)
        if not c: continue
        nombre = f"{e.get('que')}" + (f" «{e.get('etiqueta') or e.get('texto') or e.get('objeto') or ''}»"[:40] if (e.get('etiqueta') or e.get('texto') or e.get('objeto')) else "")
        if c[1] < Y0_ - 30: err.append(f"{d}: {nombre} se sube al texto de arriba (súbelo menos: y más grande)")
        if c[3] > 1800: err.append(f"{d}: {nombre} se sale por abajo (y más chico o tam más chico)")
        cajas.append((j, e, c, nombre))
    for a in range(len(cajas)):
        for b in range(a + 1, len(cajas)):
            ja, ea, ca, na = cajas[a]; jb, eb, cb, nb = cajas[b]
            if ea.get("sale") or eb.get("sale"): continue
            qa, qb = ea.get("que"), eb.get("que")
            if (qa in ENCIMA_OK and qb in DEBAJO_OK) or (qb in ENCIMA_OK and qa in DEBAJO_OK): continue
            ix = min(ca[2], cb[2]) - max(ca[0], cb[0]); iy = min(ca[3], cb[3]) - max(ca[1], cb[1])
            if ix <= 0 or iy <= 0: continue
            menor = min((ca[2] - ca[0]) * (ca[3] - ca[1]), (cb[2] - cb[0]) * (cb[3] - cb[1]))
            if ix * iy > 0.08 * menor:
                err.append(f"{d}: {na} y {nb} se enciman; sepáralos (cambia x/y o tam)")
    return err


# ---------------------------------------------------------------- revisión sin IA
def tokens(linea):
    """Palabras como se ven en pantalla (las cifras entre corchetes cuentan como una)."""
    out, pos = [], 0
    for m in TAG.finditer(linea):
        out += linea[pos:m.start()].split(); out.append(m.group(1)); pos = m.end()
    out += linea[pos:].split()
    return [t for t in out if re.search(r"\w", t)]


def revisar(lineas, escenas, ficha, marca):
    err = []
    if not LINEAS[0] <= len(lineas) <= LINEAS[1]: err.append(f"el guion tiene {len(lineas)} líneas; deben ser de {LINEAS[0]} a {LINEAS[1]}")
    habladas = 0
    for i, l in enumerate(lineas):
        tk = tokens(l)
        if len(tk) > 9: err.append(f"línea {i} tiene {len(tk)} palabras en pantalla (máximo 9): {l}")
        if len(tk) < 2: err.append(f"línea {i} es demasiado corta: {l}")
        for m in TAG.finditer(l):
            if re.search(r"\d", m.group(2)): err.append(f"línea {i}: la parte hablada de [{m.group(1)}|{m.group(2)}] debe ir con letras")
        if re.search(r"\d", TAG.sub("", l)): err.append(f"línea {i}: hay una cifra fuera de [mostrado|hablado]: {l}")
        if l.count("*") % 2: err.append(f"línea {i}: asteriscos sin cerrar: {l}")
        habladas += len(TAG.sub(r"\2", l).replace("*", "").split())
        low = l.lower()
        for p in PROHIBIDO:
            if re.search(p, low): err.append(f"línea {i}: frase prohibida ({p}): {l}")
    if not PALABRAS[0] <= habladas <= PALABRAS[1]: err.append(f"el guion tiene {habladas} palabras habladas; deben ser de {PALABRAS[0]} a {PALABRAS[1]}")
    # IUL: solo cuando toca, y siempre con sus frases obligatorias
    todo = " ".join(lineas).lower()
    tiene_iul = bool(re.search(r"\biul\b|seguro de vida indexado", todo))
    if ficha.get("con_iul"):
        if not tiene_iul: err.append("este video lleva IUL: preséntalo como [IUL|i u ele], un *seguro de vida indexado*")
        if "asesor certificado" not in todo: err.append("falta la línea: Un *asesor certificado* debe ver tu caso a detalle.")
        for i, l in enumerate(lineas):
            if re.search(r"\[10%\|", l) and "hasta" not in l.lower(): err.append(f"línea {i}: el 10% del IUL siempre va con 'hasta': {l}")
        for i, l in enumerate(lineas):
            if re.search(r"\btope\b|\bm[aá]xim|\bl[ií]mite\b", l.lower()) and not re.search(r"\[10%\|", l):
                err.append(f"línea {i}: el único tope es el 10% al año; el dinero no tiene tope (depende de cuándo empiezas): {l}")
    elif tiene_iul:
        err.append("este video es de puro valor: no menciones el IUL ni seguros de vida")
    if len(lineas) >= 2:
        if "sígueme" not in lineas[-2].lower(): err.append("la penúltima línea debe empezar el cierre con *Sígueme*")
        if "compártelo" not in lineas[-1].lower(): err.append("la última línea debe decir 'compártelo'")

    # cifras
    nums, e2 = permitidos(ficha); err += e2
    def ok(v):
        return v <= 12 or any(abs(v - n) <= abs(n) * 0.10 + 0.01 for n in nums)
    for i, l in enumerate(lineas):
        for m in TAG.finditer(l):
            for s in re.findall(r"\d[\d,]*(?:\.\d+)?", m.group(1)):
                v = float(s.replace(",", ""))
                if not ok(v): err.append(f"línea {i}: la cifra {m.group(1)} no sale de la ficha del tema (datos o cálculos)")

    # escenas
    if not isinstance(escenas, list) or not escenas: return err + ["escenas vacías o mal formadas"]
    def textos(o):
        if isinstance(o, str): yield o
        elif isinstance(o, dict):
            for v in o.values(): yield from textos(v)
        elif isinstance(o, list):
            for v in o: yield from textos(v)
    for s in (textos(escenas) if ficha.get("con_iul") else []):
        if re.search(r"\btope\b|\bm[aá]xim|\bl[ií]mite\b", s.lower()) and "10" not in s:
            err.append(f"escenas: «{s}»: no llames tope ni máximo a una cantidad de dinero; el único tope es el 10% al año")
    tks = [[norm(t) for t in tokens(l)] for l in lineas]
    def ref(r, donde):
        if not isinstance(r, list) or not r or not isinstance(r[0], int): err.append(f"{donde}: referencia mal escrita {r}"); return None
        if not 0 <= r[0] < len(lineas): err.append(f"{donde}: la línea {r[0]} no existe"); return None
        if len(r) > 1 and isinstance(r[1], str):
            k = norm(r[1])
            if not k or not any(k in t for t in tks[r[0]]): err.append(f"{donde}: la palabra '{r[1]}' no está en la línea {r[0]}: {lineas[r[0]]}")
        return r[0]
    def recorrer(o, donde):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in REFS and isinstance(v, list) and v and isinstance(v[0], int): ref(v, f"{donde}.{k}")
                elif k == "objeto" and v not in OBJETOS: err.append(f"{donde}: objeto '{v}' no existe")
                else: recorrer(v, f"{donde}.{k}")
        elif isinstance(o, list):
            for j, x in enumerate(o): recorrer(x, f"{donde}[{j}]")
    inicios = []
    for i, e in enumerate(escenas):
        d = f"escena {i} ({e.get('tipo')})"
        if e.get("tipo") not in TIPOS: err.append(f"{d}: tipo desconocido"); continue
        if not e.get("capitulo"): err.append(f"{d}: falta capitulo")
        recorrer(e, d)
        ini = e.get("desde", [None])[0]; inicios.append(ini)
        t = e["tipo"]
        try:
            if t == "tablero":
                f = e["filas"]
                if len(f) != 2 or any(not re.fullmatch(r"[A-Z0-9 ]{1,7}", x) for x in f): err.append(f"{d}: filas deben ser 2 palabras en MAYÚSCULAS sin acentos de máximo 7 letras: {f}")
            if t == "lienzo":
                els = e.get("elementos")
                if not isinstance(els, list) or not 1 <= len(els) <= 6: err.append(f"{d}: el lienzo necesita de 1 a 6 elementos")
                else:
                    ids = {x.get("id") for x in els if x.get("id")}
                    ini0 = (e.get("desde") or [None])[0]
                    visibles = [x for x in els if x.get("que") not in ("dinero", "flecha", "tacha")]
                    def temprano(x):
                        en = x.get("en")
                        if not en: return True
                        if en[0] != ini0 or ini0 is None or not 0 <= ini0 < len(lineas): return False
                        if len(en) < 2 or not isinstance(en[1], str): return True
                        k = norm(en[1]); pal = [norm(w) for w in tokens(lineas[ini0])]
                        return any(k and k in w for w in pal[:3])
                    err.extend(acomodo(els, d))
                    if not any(temprano(x) for x in visibles):
                        err.append(f"{d}: la pantalla queda vacía al empezar; al menos un elemento tiene que entrar en las primeras 3 palabras de la línea {ini0} (o sin 'en')")
                    for j, x in enumerate(els):
                        dx = f"{d}.elementos[{j}]"
                        if x.get("que") not in ELEMENTOS: err.append(f"{dx}: 'que' debe ser uno de {sorted(ELEMENTOS)}")
                        for k in ("x", "y"):
                            if k in x and not (isinstance(x[k], (int, float)) and 0 <= x[k] <= 100): err.append(f"{dx}: {k} debe ir de 0 a 100")
                        for k in ("de", "a", "sobre"):
                            if k in x and x[k] not in ids: err.append(f"{dx}: '{k}' apunta a un id que no existe: {x[k]}")
                        q = x.get("que")
                        if q == "globo" and len(str(x.get("texto", ""))) > 60: err.append(f"{dx}: el globo aguanta máximo 60 caracteres")
                        if q == "sello" and len(str(x.get("texto", ""))) > 14: err.append(f"{dx}: el sello aguanta máximo 14 caracteres")
                        if q == "texto" and len(str(x.get("texto", "")).split()) > 6: err.append(f"{dx}: el texto grande aguanta máximo 6 palabras")
                        if q in ("persona", "objeto", "torre") and len(str(x.get("etiqueta") or "")) > 16: err.append(f"{dx}: la etiqueta aguanta máximo 16 caracteres")
                        if q == "lista":
                            its = x.get("items") or []
                            if not 2 <= len(its) <= 4: err.append(f"{dx}: la lista lleva de 2 a 4 pasos")
                            if any(len(str(i.get("texto", ""))) > 40 for i in its): err.append(f"{dx}: cada paso de la lista aguanta máximo 40 caracteres")
                        if q == "recibo":
                            rs = x.get("renglones") or []
                            if not 2 <= len(rs) <= 5: err.append(f"{dx}: el recibo lleva de 2 a 5 renglones")
                            if any(len(str(r.get("texto", ""))) + len(str(r.get("valor", ""))) > 32 for r in rs): err.append(f"{dx}: un renglón del recibo no cabe (texto + valor, máximo 32 caracteres)")
                            m = x.get("marca")
                            if m and not (isinstance(m.get("fila"), int) and 0 <= m["fila"] < len(rs)): err.append(f"{dx}: marca.fila no existe en el recibo")
                        if q == "grafica" and not (all(isinstance(x.get(k), (int, float)) and x[k] >= 0 for k in ("inicio", "final")) and x["inicio"] + x["final"] > 0): err.append(f"{dx}: la gráfica necesita inicio y final (números; uno de los dos puede ser 0)")
                        if q == "torre" and not isinstance(x.get("valor"), (int, float)): err.append(f"{dx}: la torre necesita valor (número)")
                        if x.get("que") in ("torre", "cifra") and isinstance(x.get("valor"), (int, float)) and not ok(float(x["valor"])): err.append(f"{dx}: el valor {x['valor']} no sale de la ficha")
            if t == "comparativa":
                for r in e["filas"]:
                    if not float(r["b"]) < float(r["a"]): err.append(f"{d}: en '{r['titulo']}' b debe ser menor que a")
                    for v in (r["a"], r["b"]):
                        if not ok(float(v)): err.append(f"{d}: el valor {v} no sale de la ficha")
            if t == "colgantes" and not 2 <= len(e["items"]) <= 3: err.append(f"{d}: deben ser 2 o 3 items")
            if t == "pasos" and (len(e["tasas"]) != 3 or e["elegida"] not in (0, 1, 2)): err.append(f"{d}: necesita 3 tasas y elegida 0, 1 o 2")
            if t == "cifra" and not ok(float(e["valor"])): err.append(f"{d}: el valor {e['valor']} no sale de la ficha")
            if t == "tiempo" and not ok(float(e["banco"]["valor"])): err.append(f"{d}: el valor del banco no sale de la ficha")
        except (KeyError, TypeError, ValueError) as x:
            err.append(f"{d}: faltan campos o están mal ({x})")
    if inicios and inicios[0] != 0: err.append("la primera escena debe empezar en la línea 0")
    if any(a is None or b is None or b <= a for a, b in zip(inicios, inicios[1:])): err.append(f"los 'desde' deben ir en orden creciente: {inicios}")
    else:
        for a, b in zip(inicios + [], inicios[1:] + [len(lineas)]):
            if b - a > 4: err.append(f"una escena cubre {b - a} líneas (desde la {a}); máximo 4")
    tipos = [e.get("tipo") for e in escenas]
    for t in ("tablero", "oscura"):
        if t not in tipos: err.append(f"falta la escena {t}")
    if tipos.count("lienzo") < 6: err.append(f"usa al menos 6 lienzos diseñados para sus líneas (hay {tipos.count('lienzo')})")
    if tipos.count("cifra") > 1: err.append("máximo 1 escena 'cifra' por video; lo demás va en lienzos")
    if tipos[-1] != "cierre": err.append("la última escena debe ser cierre")
    elif inicios[-1] != len(lineas) - 2: err.append("el cierre debe empezar en la penúltima línea")
    return err



def revisar_aviso(aviso):
    """El aviso de abajo tampoco puede curarse en salud ni hablar de topes en dólares."""
    s = aviso.lower()
    malas = ("promesa", "garantiz") + (() if "10" in s else ("tope", "máximo"))
    return [f"aviso: quita «{m}» del aviso: {aviso}" for m in malas if m in s]

# ---------------------------------------------------------------- Claude
def cliente():
    import anthropic
    return anthropic.Anthropic()


def llamar(c, **kw):
    """Mensaje a Claude con respaldo automático si el modelo rechaza, y continuación de turnos pausados."""
    msgs = kw.pop("messages")
    for _ in range(5):
        # Streaming: el guion con sus escenas de lienzo es largo; así no se corta ni se vence la conexión.
        with c.beta.messages.stream(model=MODELO, max_tokens=64000, messages=msgs,
                                    betas=["server-side-fallback-2026-07-01"], extra_body={"fallbacks": "default"}, **kw) as s:
            r = s.get_final_message()
        if r.stop_reason == "pause_turn":
            msgs = msgs + [{"role": "assistant", "content": r.content}]; continue
        if r.stop_reason == "refusal": raise RuntimeError(f"Claude rechazó el pedido: {getattr(r, 'stop_details', None)}")
        if r.stop_reason == "max_tokens": raise RuntimeError("la respuesta se cortó (max_tokens)")
        return r
    raise RuntimeError("demasiadas pausas en la búsqueda web")


def texto(r):
    return "\n".join(b.text for b in r.content if b.type == "text")


TAREA_VALOR = """Tarea: elige UN tema nuevo: una trampa o un secreto de dinero del día a día en Estados Unidos con un ejemplo con números que duela (una comparación A contra B donde la gente pierde dinero sin darse cuenta) y una salida práctica. Lo que mejor funciona con esta audiencia: trampas al comprar troca o casa, tarjetas de tienda y "cero por ciento", préstamos caros, cargos del banco, estafas, impuestos del que cobra por contrato, gastos hormiga. Busca en la web datos actuales de Estados Unidos (tasas promedio, precios, reglas) en fuentes serias (Reserva Federal, CFPB, IRS, FTC, Census, Bankrate, NerdWallet, Experian, Kelley Blue Book). Nada de inversiones en acciones ni criptomonedas, nada de seguros (ni de vida ni de auto), y no mandes a la gente a cooperativas ni a planes del trabajo."""
TAREA_IUL = """Tarea: este video lleva el IUL (seguro de vida indexado) como la salida natural del problema. Elige UN tema nuevo que gire alrededor de uno de sus 3 beneficios: ahorro para el retiro (el dinero que se pierde en el banco, en el colchón, en gastos hormiga, en una troca que se deprecia, o el costo de empezar tarde), protección de la familia si tú faltas (el seguro del trabajo que no alcanza, la familia que depende de tus envíos), o beneficios en vida si te da una enfermedad crónica, crítica o terminal (el que trabaja con su cuerpo). Busca en la web los datos del problema en Estados Unidos (inflación, tasas del banco, depreciación, Seguro Social, etc.) en fuentes serias. Para el IUL no busques nada: sus cifras ya están en la ficha (crece hasta un 10% al año, piso cero, retiro de hasta medio millón). Calcula las proyecciones con el 10% al año (aporte al inicio de cada año, interés anual), atadas a la edad en que empieza la persona (ej.: empieza a los 30 y llega a los 60). El dinero que se junta no tiene tope; el único tope es el 10% de crecimiento de un año."""


def investigar(c, marca, historia, iul=False, beneficio=None):
    pedido = f"""Eres investigador de contenido de finanzas personales para la marca "{marca['nombre']}".
Tono de la marca: {marca['tono']}
Temas preferidos: {', '.join(marca['temas'])}.
Audiencia: hispanos en Estados Unidos de 30 a 55 años que trabajan en oficios (roofing, jardinería, construcción). No saben de finanzas.

Videos que la marca YA hizo. No repitas ni el tema, ni la idea de fondo, ni el dato del gancho, aunque lo digas con otras palabras. Si tu idea se parece a alguna de esta lista (mismo problema, misma cifra principal o misma salida), descártala y busca otra distinta:
{chr(10).join('- ' + h for h in historia) or '- (ninguno)'}
{f"""
En este video el IUL entra por UN solo beneficio: {beneficio[0]} ({beneficio[1]}). No uses los otros dos como tema central. Y dentro de ese beneficio, busca un problema que NO esté en la lista de arriba.""" if iul and beneficio else ""}

{TAREA_IUL if iul else TAREA_VALOR}

Responde al final con UN bloque ```json con esta forma exacta:
{{
  "titulo": "nombre corto del tema",
  "angulo": "la contradicción o sorpresa en una frase",
  "explicacion": "3 a 5 frases simples",
  "datos": [{{"dato": "qué es", "valor": número, "unidad": "$ o % o meses", "fuente": "https://..."}}],
  "calculos": [{{"descripcion": "qué calcula", "expresion": "aritmética en Python con números, ej. 40000*(0.09/12)/(1-(1+0.09/12)**-72)", "resultado": número}}],
  "consejo": "la acción concreta",
  "que_no_decir": ["frases o promesas a evitar"]
}}
Reglas de los cálculos: solo números y + - * / ** ( ) round(). Calcula todo lo que el video vaya a mostrar (pagos, totales, intereses, diferencias, ahorros), redondeado a 2 decimales."""
    r = llamar(c, messages=[{"role": "user", "content": pedido}],
               tools=[{"type": "web_search_20260209", "name": "web_search", "max_uses": 6}],
               output_config={"effort": "medium"})
    t = texto(r)
    m = re.findall(r"```json\s*(\{.*?\})\s*```", t, re.S)
    if not m: raise RuntimeError("la investigación no devolvió el bloque JSON")
    ficha = json.loads(m[-1])
    ficha["con_iul"] = iul
    if iul and beneficio: ficha["beneficio_iul"] = beneficio[0]
    if iul: ficha["datos"] = ficha.get("datos", []) + DATOS_IUL
    return ficha


ESQUEMA = {"type": "object", "additionalProperties": False, "required": ["titulo", "lineas", "escenas_json", "aviso"],
           "properties": {"titulo": {"type": "string"}, "lineas": {"type": "array", "items": {"type": "string"}},
                          "escenas_json": {"type": "string"}, "aviso": {"type": "string"}}}


def escribir(c, marca, ficha, ejemplos, errores=None, previo=None):
    cerebro = leer(f"estilos/{marca['estilo']}/cerebro.md")
    sistema = [{"type": "text", "text": cerebro + "\n\n## Videos modelo (ya aprobados)\n" + ejemplos, "cache_control": {"type": "ephemeral", "ttl": "1h"}}]
    pedido = f"""Marca: {marca['nombre']} (código {marca['codigo']}). Tono: {marca['tono']}
Nombre para el cierre: "{marca['nombre']}". Lema para el cierre (campo sub): "dinero claro para tu familia".

Ficha del tema investigado (las únicas cifras permitidas están en "datos" y "calculos"):
{json.dumps(ficha, ensure_ascii=False, indent=1)}

Este video {"LLEVA el IUL (con_iul: true): sigue la sección del IUL del cerebro al pie de la letra" if ficha.get("con_iul") else "es de PURO VALOR (con_iul: false): no menciones el IUL ni seguros"}.
Largo: de {LINEAS[0]} a {LINEAS[1]} líneas y de {PALABRAS[0]} a {PALABRAS[1]} palabras habladas. Gancho fuerte con open loop que se cierra al final.

Escribe el video siguiendo el cerebro de EST-01:
- "lineas": las líneas del guion, en orden, con el formato [mostrado|hablado] y *clave*.
- "escenas_json": la lista de escenas como texto JSON (una lista [...] de objetos), con las referencias a palabras que existan en esas líneas. Diséñalas junto con el guion: cada lienzo dibuja lo que dicen sus líneas (personas, torres de monedas, recibos, celular, dinero que vuela, gráficas), sin objetos de relleno.
- "aviso": una frase corta para abajo de la pantalla: "Ejemplo: <el supuesto del ejemplo>. Contenido educativo, no es asesoría financiera."
- "titulo": nombre corto del video."""
    msgs = [{"role": "user", "content": pedido}]
    if errores:
        msgs += [{"role": "assistant", "content": json.dumps(previo, ensure_ascii=False)},
                 {"role": "user", "content": "La revisión automática encontró estos problemas. Corrígelos todos y devuelve el video completo otra vez:\n- " + "\n- ".join(errores)}]
    r = llamar(c, system=sistema, messages=msgs, output_config={"effort": "high", "format": {"type": "json_schema", "schema": ESQUEMA}})
    return json.loads(texto(r))


# ---------------------------------------------------------------- archivos
def calificados(minimo=9, maximo=4):
    """Guiones de entrenamiento con nota alta (entrenamiento/ronda-N/notas) para usarlos como modelo."""
    out = []
    for f in sorted(glob.glob(os.path.join(ROOT, "entrenamiento", "ronda-*", "guiones.txt")), reverse=True):
        notas = {}
        for n in glob.glob(os.path.join(os.path.dirname(f), "notas", "notas", "*.json")):
            d = json.load(open(n, encoding="utf-8")); d = d.get("data", d)
            if isinstance(d.get("nota"), (int, float)): notas[os.path.basename(n)[:-5]] = d
        cur = None; G = []
        for l in open(f, encoding="utf-8"):
            l = l.rstrip("\n")
            if l.startswith("## "): cur = [x.strip() for x in l[3:].split("|")] + [[]]; G.append(cur)
            elif l.strip() and not l.startswith("#") and cur: cur[3].append(l.strip())
        for i, tt, g, L in G:
            if i in notas and notas[i]["nota"] >= minimo:
                out.append((-notas[i]["nota"], f"### {i} · {tt} · gancho: {g} · nota de Antony: {notas[i]['nota']}/10\n" + "\n".join(L)))
    return [x for _, x in sorted(out, key=lambda z: z[0])][:maximo]


def ejemplos_de(estilo):
    ej = os.path.join(ROOT, "estilos", estilo, "ejemplo_escenas.json")
    if os.path.exists(ej):
        d = json.load(open(ej, encoding="utf-8"))
        txt = ("### Ejemplo de escenas diseñadas con lienzo (video corto viejo: copia cómo se diseñan las escenas para lo que se dice, NO el largo ni el relleno 'alcancía, troca, escuela')\nlineas:\n"
               + "\n".join(f"{i}: {l}" for i, l in enumerate(d["lineas"])) + "\nescenas:\n" + json.dumps(d["escenas"], ensure_ascii=False))
        cal = calificados()
        if cal: txt += "\n\n## Guiones que Antony calificó con 9 o 10 (copia la fuerza del gancho y de la cifra; hoy el video es más largo y con open loop)\n" + "\n\n".join(cal)
        return txt
    out = []
    for d in sorted(glob.glob(os.path.join(ROOT, "videos", "*"))):
        g, e = os.path.join(d, "guion.txt"), os.path.join(d, "escenas.json")
        if not (os.path.exists(g) and os.path.exists(e)): continue
        esc = json.load(open(e, encoding="utf-8"))
        if esc.get("estilo") != estilo or not esc.get("modelo", True): continue
        lin = [l.rstrip("\n") for l in open(g, encoding="utf-8") if l.strip() and not l.startswith("#")]
        out.append(f"### {os.path.basename(d)}\nlineas:\n" + "\n".join(f"{i}: {l}" for i, l in enumerate(lin)) + "\nescenas:\n" + json.dumps(esc["escenas"], ensure_ascii=False))
        if len(out) >= 1: break
    txt = "### Formato de escenas (video viejo y corto: copia el formato JSON, NO el largo ni el gancho)\n" + "\n\n".join(out)
    cal = calificados()
    if cal: txt += "\n\n## Guiones que Antony calificó con 9 o 10 (copia la fuerza del gancho y de la cifra; hoy el video es más largo y con open loop)\n" + "\n\n".join(cal)
    return txt


def historia_de(codigo):
    """Lo que la marca ya hizo: título, idea de fondo, gancho y si llevó IUL (para no repetir la idea con otras palabras)."""
    hs = []
    for g in sorted(glob.glob(os.path.join(ROOT, "videos", f"{codigo}-*", "guion.txt"))):
        D = os.path.dirname(g)
        lin = [l.strip() for l in open(g, encoding="utf-8")]
        prim = lin[0] if lin else ""
        titulo = prim.split("·")[-1].strip() if "·" in prim else prim.lstrip("# ")
        cuerpo = [TAG.sub(r"\1", l).replace("*", "") for l in lin if l and not l.startswith("#")]
        h = f"{os.path.basename(D)} «{titulo}»"
        tj = os.path.join(D, "tema.json")
        if os.path.exists(tj):
            f = json.load(open(tj, encoding="utf-8"))
            if f.get("con_iul"): h += f" [IUL: {f.get('beneficio_iul', 'sin clasificar')}]"
            if f.get("angulo"): h += f" · idea: {f['angulo']}"
        if cuerpo: h += " · gancho: " + " ".join(cuerpo[:2])
        hs.append(h)
    return hs


BENEFICIOS_IUL = [
    ("ahorro para el retiro", "el dinero que hoy se pierde o no crece (en el banco, en el colchón, en gastos hormiga, en una troca que se deprecia) o el costo de empezar tarde, contra un ahorro que crece con interés compuesto"),
    ("protección de la familia si tú faltas", "qué le pasa a la familia (la de aquí o la que depende de tus envíos) si el que trae el dinero falta: el seguro del trabajo que no alcanza o que se pierde al cambiar de patrón"),
    ("beneficios en vida si te enfermas", "una enfermedad crónica, crítica o terminal que te deja sin poder trabajar, y poder usar parte del beneficio en vida"),
]


def beneficio_iul(codigo):
    """El beneficio del IUL va rotando: el menos usado hasta ahora (y, en empate, el que no fue el último)."""
    usados = []
    for tj in sorted(glob.glob(os.path.join(ROOT, "videos", f"{codigo}-*", "tema.json"))):
        f = json.load(open(tj, encoding="utf-8"))
        if f.get("con_iul") and f.get("beneficio_iul"): usados.append(f["beneficio_iul"])
    nombres = [b[0] for b in BENEFICIOS_IUL]
    orden = sorted(nombres, key=lambda n: (usados.count(n), n == (usados[-1] if usados else None), nombres.index(n)))
    return next(b for b in BENEFICIOS_IUL if b[0] == orden[0])


def siguiente(codigo):
    ns = [int(m.group(1)) for d in glob.glob(os.path.join(ROOT, "videos", f"{codigo}-*")) if (m := re.search(r"-(\d+)$", d))]
    return f"{codigo}-{(max(ns) + 1 if ns else 1):03d}"


def guardar(cod, marca, ficha, v, escenas):
    D = os.path.join(ROOT, "videos", cod); os.makedirs(D, exist_ok=True)
    json.dump(ficha, open(os.path.join(D, "tema.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    cab = [f"# {cod} · {marca['nombre']} · {marca['estilo']} · {v['titulo']}",
           "# Escrito por Claude (API) desde la ficha tema.json. Cifras verificadas con Python en la revisión.",
           *[f"# Fuente: {d['dato']} = {d['valor']} {d.get('unidad', '')} · {d['fuente']}" for d in ficha.get("datos", [])],
           "# BLOQUE 1"]
    open(os.path.join(D, "guion.txt"), "w", encoding="utf-8").write("\n".join(cab + v["lineas"]) + "\n")
    json.dump({"marca": marca["slug"], "estilo": marca["estilo"], "musica": marca.get("musica", "jugueton"), "aviso": v["aviso"],
               "con_iul": bool(ficha.get("con_iul")), "visual": visual_de(cod), "escenas": escenas},
              open(os.path.join(D, "escenas.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def revisar_existente(cod):
    D = os.path.join(ROOT, "videos", cod)
    lin = [l.rstrip("\n") for l in open(os.path.join(D, "guion.txt"), encoding="utf-8") if l.strip() and not l.startswith("#")]
    esc = json.load(open(os.path.join(D, "escenas.json"), encoding="utf-8"))
    ficha = json.load(open(os.path.join(D, "tema.json"), encoding="utf-8")) if os.path.exists(os.path.join(D, "tema.json")) else None
    if ficha is None:  # videos hechos a mano: autoriza las cifras que trae el propio guion
        nums = [float(s.replace(",", "")) for l in lin for m in TAG.finditer(l) for s in re.findall(r"\d[\d,]*(?:\.\d+)?", m.group(1))]
        ficha = {"datos": [{"dato": "manual", "valor": n, "fuente": "https://manual"} for n in nums]}
    marca = json.load(open(os.path.join(ROOT, "marcas", esc["marca"] + ".json"), encoding="utf-8"))
    e = revisar(lin, esc["escenas"], ficha, marca)
    print(f"{cod}: {'OK' if not e else str(len(e)) + ' problemas'}"); [print("  -", x) for x in e]
    return not e


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--marca"); ap.add_argument("--cantidad", type=int, default=1); ap.add_argument("--revisar")
    a = ap.parse_args()
    if a.revisar: sys.exit(0 if all(revisar_existente(x) for x in a.revisar.split(",")) else 1)
    marca = json.load(open(os.path.join(ROOT, "marcas", a.marca + ".json"), encoding="utf-8")); marca["slug"] = a.marca
    c = cliente(); hechos = []
    ejemplos = ejemplos_de(marca["estilo"])
    for _ in range(a.cantidad):
        cod = siguiente(marca["codigo"])
        try:
            iul = con_iul(cod); ben = beneficio_iul(marca["codigo"]) if iul else None
            ficha = investigar(c, marca, historia_de(marca["codigo"]), iul, ben)
            print(f"{cod}: tema «{ficha['titulo']}» · {('con IUL · ' + ben[0]) if ficha['con_iul'] else 'puro valor'} · {len(ficha.get('datos', []))} datos · {len(ficha.get('calculos', []))} cálculos")
            v = escribir(c, marca, ficha, ejemplos)
            esc = json.loads(v["escenas_json"]) if isinstance(v.get("escenas_json"), str) else []
            err = revisar(v["lineas"], esc, ficha, marca) + revisar_aviso(v.get("aviso", ""))
            for _ in range(2):   # hasta 2 correcciones
                if not err: break
                print(f"{cod}: {len(err)} problemas, Claude los corrige:"); [print("  -", x) for x in err]
                v = escribir(c, marca, ficha, ejemplos, err, v)
                esc = json.loads(v["escenas_json"]) if isinstance(v.get("escenas_json"), str) else []
                err = revisar(v["lineas"], esc, ficha, marca) + revisar_aviso(v.get("aviso", ""))
            if err:
                print(f"::error::{cod} no pasó la revisión:"); [print("  -", x) for x in err]
                D = os.path.join(ROOT, "rechazados"); os.makedirs(D, exist_ok=True)
                json.dump({"ficha": ficha, "video": v, "errores": err}, open(os.path.join(D, cod + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
                continue
            guardar(cod, marca, ficha, v, esc); hechos.append(cod)
            print(f"{cod}: listo «{v['titulo']}» · {len(v['lineas'])} líneas · {len(esc)} escenas")
        except Exception as x:
            print(f"::error::{cod} falló: {x}")
    out = os.environ.get("GITHUB_OUTPUT")
    if out: open(out, "a").write("lista=" + json.dumps(hechos) + "\n")
    print("hechos:", hechos)
    if not hechos: sys.exit(1)


if __name__ == "__main__":
    main()
