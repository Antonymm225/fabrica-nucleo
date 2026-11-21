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
OBJETOS = {"tarjeta", "alcancia", "casa", "troca", "escuela", "banco", "calendario", "billete", "moneda"}
TIPOS = {"cifra", "armar", "tablero", "tiempo", "colgantes", "comparativa", "pasos", "oscura", "cierre"}
PROHIBIDO = [r"garantiz", r"sin riesgo", r"libre de impuestos", r"hazte rico", r"link en (mi|el) perfil", r"agenda", r"cotiza", r"\biul\b",
             r"\bvos\b", r"\btenés\b", r"\bcomentá\b", r"criptomoneda", r"bitcoin", r"acciones de"]
REFS = {"en", "desde", "hasta", "armado", "elegir", "alcancia", "seguir", "compartir"}


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
    if not 16 <= len(lineas) <= 22: err.append(f"el guion tiene {len(lineas)} líneas; deben ser de 16 a 22")
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
    if not 110 <= habladas <= 165: err.append(f"el guion tiene {habladas} palabras habladas; deben ser de 110 a 165")
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
    if tipos[-1] != "cierre": err.append("la última escena debe ser cierre")
    elif inicios[-1] != len(lineas) - 2: err.append("el cierre debe empezar en la penúltima línea")
    return err


# ---------------------------------------------------------------- Claude
def cliente():
    import anthropic
    return anthropic.Anthropic()


def llamar(c, **kw):
    """Mensaje a Claude con respaldo automático si el modelo rechaza, y continuación de turnos pausados."""
    msgs = kw.pop("messages")
    for _ in range(5):
        r = c.beta.messages.create(model=MODELO, max_tokens=16000, messages=msgs,
                                   betas=["server-side-fallback-2026-07-01"], extra_body={"fallbacks": "default"}, **kw)
        if r.stop_reason == "pause_turn":
            msgs = msgs + [{"role": "assistant", "content": r.content}]; continue
        if r.stop_reason == "refusal": raise RuntimeError(f"Claude rechazó el pedido: {getattr(r, 'stop_details', None)}")
        if r.stop_reason == "max_tokens": raise RuntimeError("la respuesta se cortó (max_tokens)")
        return r
    raise RuntimeError("demasiadas pausas en la búsqueda web")


def texto(r):
    return "\n".join(b.text for b in r.content if b.type == "text")


def investigar(c, marca, historia):
    pedido = f"""Eres investigador de contenido de finanzas personales para la marca "{marca['nombre']}".
Tono de la marca: {marca['tono']}
Temas preferidos: {', '.join(marca['temas'])}.
Audiencia: hispanos en Estados Unidos de 30 a 55 años que trabajan en oficios (roofing, jardinería, construcción). No saben de finanzas.

Temas que la marca YA hizo (no repitas ni el tema ni el ángulo):
{chr(10).join('- ' + h for h in historia) or '- (ninguno)'}

Tarea: elige UN tema nuevo de finanzas del día a día con un ejemplo con números que sorprenda (una comparación A contra B donde la gente pierde dinero sin darse cuenta) y un consejo práctico. Busca en la web datos actuales de Estados Unidos (tasas promedio, precios, reglas) en fuentes serias (Reserva Federal, CFPB, IRS, Census, Bankrate, NerdWallet, Experian, Kelley Blue Book). Nada de inversiones en acciones ni criptomonedas, ni de seguros específicos.

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
    return json.loads(m[-1])


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

Escribe el video siguiendo el cerebro de EST-01:
- "lineas": las líneas del guion, en orden, con el formato [mostrado|hablado] y *clave*.
- "escenas_json": la lista de escenas como texto JSON (una lista [...] de objetos), con las referencias a palabras que existan en esas líneas.
- "aviso": una frase corta para abajo de la pantalla: "Ejemplo: <el supuesto del ejemplo>. Contenido educativo, no es asesoría financiera."
- "titulo": nombre corto del video."""
    msgs = [{"role": "user", "content": pedido}]
    if errores:
        msgs += [{"role": "assistant", "content": json.dumps(previo, ensure_ascii=False)},
                 {"role": "user", "content": "La revisión automática encontró estos problemas. Corrígelos todos y devuelve el video completo otra vez:\n- " + "\n- ".join(errores)}]
    r = llamar(c, system=sistema, messages=msgs, output_config={"effort": "high", "format": {"type": "json_schema", "schema": ESQUEMA}})
    return json.loads(texto(r))


# ---------------------------------------------------------------- archivos
def ejemplos_de(estilo):
    out = []
    for d in sorted(glob.glob(os.path.join(ROOT, "videos", "*"))):
        g, e = os.path.join(d, "guion.txt"), os.path.join(d, "escenas.json")
        if not (os.path.exists(g) and os.path.exists(e)): continue
        esc = json.load(open(e, encoding="utf-8"))
        if esc.get("estilo") != estilo or not esc.get("modelo", True): continue
        lin = [l.rstrip("\n") for l in open(g, encoding="utf-8") if l.strip() and not l.startswith("#")]
        out.append(f"### {os.path.basename(d)}\nlineas:\n" + "\n".join(f"{i}: {l}" for i, l in enumerate(lin)) + "\nescenas:\n" + json.dumps(esc["escenas"], ensure_ascii=False))
        if len(out) >= 3: break
    return "\n\n".join(out)


def historia_de(codigo):
    hs = []
    for g in sorted(glob.glob(os.path.join(ROOT, "videos", f"{codigo}-*", "guion.txt"))):
        prim = open(g, encoding="utf-8").readline().strip()
        hs.append(prim.split("·")[-1].strip() if "·" in prim else prim.lstrip("# "))
    return hs


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
    json.dump({"marca": marca["slug"], "estilo": marca["estilo"], "musica": marca.get("musica", "jugueton"), "aviso": v["aviso"], "escenas": escenas},
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
            ficha = investigar(c, marca, historia_de(marca["codigo"]))
            print(f"{cod}: tema «{ficha['titulo']}» · {len(ficha.get('datos', []))} datos · {len(ficha.get('calculos', []))} cálculos")
            v = escribir(c, marca, ficha, ejemplos)
            esc = json.loads(v["escenas_json"]) if isinstance(v.get("escenas_json"), str) else []
            err = revisar(v["lineas"], esc, ficha, marca)
            if err:
                print(f"{cod}: {len(err)} problemas, Claude los corrige:"); [print("  -", x) for x in err]
                v = escribir(c, marca, ficha, ejemplos, err, v)
                esc = json.loads(v["escenas_json"]) if isinstance(v.get("escenas_json"), str) else []
                err = revisar(v["lineas"], esc, ficha, marca)
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
