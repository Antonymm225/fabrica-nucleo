import React from "react";
import { F, T, W, Sfx, lin, eo, eio, sp, swing, rnd, money } from "./lib";
import { Alcancia, Banco, Billete, Calendario, Casa, Check, Escuela, Etiqueta, Moneda, S, Sello, Tarjeta, Troca } from "./objetos";
import { Cartera, Familia, Globo, Hospital, Persona, Tienda, Torre, wrap, type Cara, type Gorro } from "./objetos2";
import type { Ctx, En, Out } from "./escenas";

/* LIENZO: una escena que el guionista diseña para lo que se dice en esas líneas.
   Coloca elementos (personas, objetos, torres de monedas, cifras, globos, recibos, celular, listas, gráficas)
   en coordenadas 0-100 del área de dibujo, y cada uno entra en la palabra que lo nombra. */
type P = Record<string, any>;
const Y0 = 520, AH = 1260;               // área de dibujo: de y=520 a y=1780
const X = (x: number) => (x / 100) * W;
const Y = (y: number) => Y0 + (y / 100) * AH;
const at = (c: Ctx, en?: En, def = 0) => (en ? c.t(en[0], en[1]) : def);
const COLOR = (n?: string) => (n === "tinta" ? T.K : n === "verde" ? T.A[1] : n === "azul" ? T.A[2] : n === "oro" ? T.A[0] : n === "gris" ? T.G : T.P);

export const OBJ2: Record<string, (p: any) => React.ReactElement> = {
  tarjeta: (p) => <Tarjeta {...p} />, alcancia: (p) => <Alcancia {...p} />, casa: (p) => <Casa {...p} />,
  troca: (p) => <Troca {...p} />, escuela: (p) => <Escuela {...p} />, banco: (p) => <Banco {...p} />,
  calendario: (p) => <Calendario {...p} />, billete: (p) => <Billete {...p} />, moneda: (p) => <Moneda r={(p.w ?? 120) / 2} />,
  cartera: (p) => <Cartera {...p} />, tienda: (p) => <Tienda {...p} />, hospital: (p) => <Hospital {...p} />, familia: (p) => <Familia {...p} />,
};

/** Mitad del ancho de cada elemento, para que nunca se salga de la pantalla. */
const mitad = (e: P) => {
  const tam = e.tam;
  switch (e.que) {
    case "globo": return (W * (tam ?? 74)) / 200;
    case "recibo": return (W * (tam ?? 80)) / 200;
    case "lista": case "grafica": return (W * (tam ?? 84)) / 200;
    case "celular": return (AH * (tam ?? 62)) / 400;
    case "persona": return (AH * (tam ?? 34)) / 100 * 0.34;
    case "objeto": return (W * (tam ?? 30)) / 200;
    case "torre": return 100;
    case "sello": return (W * (tam ?? 66)) / 200;
    default: return 0;
  }
};

/** Centro aproximado de un elemento (para flechas, dinero que vuela y tachones). */
const centro = (e: P): [number, number] => {
  const x = X(e.x ?? 50), y = Y(e.y ?? 50);
  if (e.que === "persona") return [x, y - (AH * (e.tam ?? 34)) / 100 * 0.55];
  if (e.que === "torre") return [x, y - (AH * (e.tam ?? 45)) / 100 * 0.5];
  return [x, y];
};

/** Animación de entrada: aparece (salta), cae (desde arriba) o desliza (desde un lado). */
const Entrada: React.FC<{ f: number; t0: number; modo?: string; x: number; y: number; sale?: number; children: React.ReactNode }> = ({ f, t0, modo = "aparece", x, y, sale = 1e9, children }) => {
  if (f < t0) return null;
  const k = sp(f, t0, { damping: modo === "cae" ? 9 : 11, stiffness: modo === "cae" ? 120 : 170 });
  const op = lin(f, t0, t0 + 4) * (1 - lin(f, sale, sale + 6));
  if (op <= 0) return null;
  let tr = `translate(${x} ${y}) scale(${0.6 + 0.4 * k})`;
  if (modo === "cae") tr = `translate(${x} ${y - (1 - k) * 900}) rotate(${swing(f, t0, 4, 22)})`;
  if (modo === "desliza") tr = `translate(${x + (1 - k) * (x < W / 2 ? -700 : 700)} ${y})`;
  return <g transform={tr} opacity={op}>{children}</g>;
};

const Recibo: React.FC<{ e: P; f: number; c: Ctx }> = ({ e, f, c }) => {
  const w = (W * (e.tam ?? 80)) / 100, filas: P[] = e.renglones ?? [], rh = 96;
  const h = 150 + filas.length * rh + (e.total ? 120 : 0);
  const marca = e.marca ? at(c, e.marca.en, 1e9) : 1e9;
  return (
    <g>
      <g filter="url(#sombra)">
        <path d={`M${-w / 2} 0 H${w / 2} V${h} ${Array.from({ length: 16 }, (_, i) => `L${w / 2 - ((i + 0.5) * w) / 16} ${h + (i % 2 ? 0 : 22)}`).join(" ")} L${-w / 2} ${h} Z`} fill={T.BL} {...S} />
      </g>
      <text x={-w / 2 + 40} y={78} fontFamily={F.mono} fontWeight={700} fontSize={36} fill={T.K} letterSpacing={5}>{(e.titulo ?? "RECIBO").toUpperCase()}</text>
      <path d={`M${-w / 2 + 40} 112 H${w / 2 - 40}`} stroke={T.K} strokeWidth={3} strokeDasharray="12 10" />
      {filas.map((r, i) => {
        const t = at(c, r.en, 6 + i * 6), k = lin(f, t, t + 10);
        if (k <= 0) return null;
        const y = 180 + i * rh, txt: string = r.texto ?? "";
        return (
          <g key={i} opacity={Math.min(1, k * 2)}>
            <text x={-w / 2 + 40} y={y} fontFamily={F.texto} fontWeight={600} fontSize={40} fill={T.K}>{txt.slice(0, Math.ceil(txt.length * k))}</text>
            {r.valor && <text x={w / 2 - 40} y={y} textAnchor="end" fontFamily={F.cifra} fontSize={44} fill={T.K}>{r.valor}</text>}
            {e.marca && e.marca.fila === i && f >= marca && (
              <ellipse cx={0} cy={y - 14} rx={w / 2 - 10} ry={52} fill="none" stroke="#D9473A" strokeWidth={8}
                strokeDasharray={2 * Math.PI * w / 2} strokeDashoffset={(1 - lin(f, marca, marca + 12)) * 2 * Math.PI * w / 2} transform={`rotate(-2 0 ${y - 14})`} />
            )}
          </g>
        );
      })}
      {e.total && f >= at(c, e.total.en, 1e9) && (
        <g transform={`translate(0 ${150 + filas.length * rh + 70})`}>
          <path d={`M${-w / 2 + 40} -60 H${w / 2 - 40}`} stroke={T.K} strokeWidth={5} />
          <text x={-w / 2 + 40} y={10} fontFamily={F.mono} fontWeight={700} fontSize={38} fill={T.K} letterSpacing={4}>{(e.total.texto ?? "TOTAL").toUpperCase()}</text>
          <text x={w / 2 - 40} y={14} textAnchor="end" fontFamily={F.cifra} fontSize={60} fill={T.P}>{e.total.valor}</text>
        </g>
      )}
      {e.marca && f >= marca + 8 && <g transform={`translate(${w / 2 - 30} ${180 + e.marca.fila * rh - 80}) rotate(${8 + swing(f, marca + 8, 8, 18)}) scale(${sp(f, marca + 8)})`}><Etiqueta texto={(e.marca.texto ?? "¡OJO!").toUpperCase()} color="#D9473A" size={34} /></g>}
    </g>
  );
};

const Celular: React.FC<{ e: P; f: number; t0: number }> = ({ e, f, t0 }) => {
  const h = (AH * (e.tam ?? 62)) / 100, w = h * 0.5, llamada = (e.modo ?? "llamada") === "llamada";
  const timbra = llamada && f - t0 < 70 ? Math.sin(f * 1.6) * 3 : 0;
  return (
    <g transform={`rotate(${timbra})`}>
      <g filter="url(#sombra)"><rect x={-w / 2} y={-h / 2} width={w} height={h} rx={w * 0.14} fill={T.K} {...S} /></g>
      <rect x={-w / 2 + 18} y={-h / 2 + 18} width={w - 36} height={h - 36} rx={w * 0.1} fill={llamada ? "#2B2530" : T.BL} />
      {llamada ? (
        <g>
          <text y={-h * 0.3} textAnchor="middle" fontFamily={F.mono} fontSize={26} fill="#a9a2ad" letterSpacing={2}>LLAMADA ENTRANTE</text>
          <circle cy={-h * 0.12} r={w * 0.18} fill={T.G} />
          <text y={-h * 0.12 + w * 0.07} textAnchor="middle" fontFamily={F.cifra} fontSize={w * 0.17} fill={T.BL}>?</text>
          {wrap(e.de ?? "Desconocido", 12).map((l, i) => <text key={i} y={h * 0.06 + i * 58} textAnchor="middle" fontFamily={F.texto} fontWeight={800} fontSize={52} fill={T.BL}>{l}</text>)}
          <circle cx={-w * 0.22} cy={h * 0.32} r={w * 0.11} fill="#D9473A" />
          <circle cx={w * 0.22} cy={h * 0.32} r={w * 0.11} fill="#3FA864" opacity={0.6 + 0.4 * Math.sin(f / 4)} />
          {f - t0 < 70 && [1, 2, 3].map((i) => <path key={i} d={`M${w / 2 + 20 + i * 26} ${-60 - i * 20} q${30 + i * 10} ${60 + i * 20} 0 ${120 + i * 40}`} fill="none" stroke={T.P} strokeWidth={7} strokeLinecap="round" opacity={(Math.floor(f / 5) + i) % 3 ? 0.9 : 0.2} />)}
        </g>
      ) : (
        <g>
          <text y={-h / 2 + 80} textAnchor="middle" fontFamily={F.texto} fontWeight={800} fontSize={40} fill={T.K}>{e.de ?? "Mensaje"}</text>
          <g transform={`translate(0 ${-h * 0.12}) scale(${sp(f, t0 + 6)})`}>
            {(() => { const L = wrap(e.texto ?? "", 16), bh = L.length * 50 + 50; return (
              <g>
                <rect x={-w / 2 + 40} y={-bh / 2} width={w - 80} height={bh} rx={28} fill="#E5E1EA" />
                {L.map((l, i) => <text key={i} x={-w / 2 + 70} y={-bh / 2 + 62 + i * 50} fontFamily={F.texto} fontWeight={600} fontSize={40} fill={T.K}>{l}</text>)}
              </g>); })()}
          </g>
        </g>
      )}
    </g>
  );
};

const Lista: React.FC<{ e: P; f: number; c: Ctx }> = ({ e, f, c }) => {
  const items: P[] = e.items ?? [], w = (W * (e.tam ?? 84)) / 100, rh = 150;
  return (
    <g>
      <g filter="url(#sombra)"><rect x={-w / 2} y={0} width={w} height={items.length * rh + 90} rx={24} fill={T.BL} {...S} /></g>
      {items.map((it, i) => {
        const t = at(c, it.en, 6 + i * 10), k = lin(f, t - 4, t + 4);
        const y = 90 + i * rh, L = wrap(it.texto ?? "", 20);
        return (
          <g key={i} opacity={0.25 + 0.75 * k}>
            <rect x={-w / 2 + 40} y={y - 46} width={64} height={64} rx={12} fill={T.B} {...S} strokeWidth={5} />
            {f >= t && <path d={`M${-w / 2 + 52} ${y - 16} l18 20 l34 -44`} fill="none" stroke={T.P} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={90} strokeDashoffset={90 * (1 - lin(f, t, t + 8, 0, 1, eo))} />}
            {L.map((l, j) => <text key={j} x={-w / 2 + 136} y={y + j * 48 - (L.length - 1) * 20} fontFamily={F.texto} fontWeight={700} fontSize={46} fill={T.K}>{l}</text>)}
          </g>
        );
      })}
    </g>
  );
};

const Grafica: React.FC<{ e: P; f: number; c: Ctx; t0: number }> = ({ e, f, c, t0 }) => {
  // Barras de monedas de `inicio` a `final` (sube o baja de forma compuesta), una por periodo.
  const n = Math.min(20, Math.max(3, e.barras ?? 10)), w = (W * (e.tam ?? 84)) / 100, hMax = AH * 0.5;
  const t1 = at(c, e.hasta, t0 + 40), k = lin(f, t0, t1, 0, 1, eio);
  const a = Math.max(1, e.inicio ?? 1), z = Math.max(1, e.final ?? 1), baja = z < a;
  const v = (i: number) => a * Math.pow(z / a, i / (n - 1));
  const g = (i: number) => v(i) / Math.max(a, z);
  const bw = w / n;
  const visible = k * n;
  const ult = Math.max(0, Math.min(n - 1, Math.ceil(visible) - 1));
  return (
    <g>
      <path d={`M${-w / 2 - 10} 0 H${w / 2 + 10}`} stroke={T.K} strokeWidth={6} strokeLinecap="round" />
      {Array.from({ length: n }, (_, i) => {
        const q = Math.max(0, Math.min(1, visible - i)); if (q <= 0) return null;
        const h = hMax * g(i) * (0.4 + 0.6 * q), x = -w / 2 + i * bw + bw / 2;
        return <g key={i} transform={`translate(${x} 0)`}><Torre n={Math.max(1, h / (bw * 0.7 * 0.13))} w={bw * 0.7} color={baja ? T.G : T.A[0]} /></g>;
      })}
      <text x={-w / 2} y={56} fontFamily={F.mono} fontWeight={700} fontSize={28} fill={T.G} letterSpacing={2}>{(e.desdeTexto ?? "AÑO 1").toUpperCase()}</text>
      <text x={w / 2} y={56} textAnchor="end" fontFamily={F.mono} fontWeight={700} fontSize={28} fill={T.G} letterSpacing={2}>{(e.hastaTexto ?? `AÑO ${n}`).toUpperCase()}</text>
      {k > 0 && (
        <text x={Math.min(w / 2, Math.max(-w / 2, -w / 2 + (ult + 0.5) * bw))} y={-hMax * g(ult) * 1 - 80} textAnchor={ult > n * 0.6 ? "end" : ult < n * 0.3 ? "start" : "middle"} fontFamily={F.cifra} fontSize={84} fill={baja ? T.G : T.P}>
          {(e.prefijo ?? "$") + Math.round(v(ult)).toLocaleString("en-US")}
        </text>
      )}
      {e.etiqueta && <text y={110} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={30} fill={T.K} letterSpacing={4}>{e.etiqueta.toUpperCase()}</text>}
    </g>
  );
};

export const lienzo = (p: P, f: number, c: Ctx): Out => {
  const els: P[] = p.elementos ?? [];
  const byId: Record<string, P> = {}; els.forEach((e) => { if (e.id) byId[e.id] = e; });
  const sfx: React.ReactNode[] = [], golpes: number[] = [];
  const capa: React.ReactNode[] = [];
  els.forEach((e, i) => {
    const t0 = at(c, e.en, i * 5), sale = e.sale ? at(c, e.sale, 1e9) : 1e9;
    const hw = mitad(e);
    const x = Math.min(W - hw - 24, Math.max(hw + 24, X(e.x ?? 50))), y = Y(e.y ?? 50);
    const key = "e" + i;
    if (["persona", "objeto", "torre", "cifra", "texto", "globo", "recibo", "celular", "lista", "grafica"].includes(e.que)) sfx.push(<Sfx key={key} at={t0} s={e.entra === "cae" ? "whoosh" : "pop"} v={0.22} />);
    if (e.que === "persona") {
      const cara: Cara = e.cambia && f >= at(c, e.cambia.en, 1e9) ? e.cambia.cara : e.cara ?? "neutro";
      const h = (AH * (e.tam ?? 34)) / 100;
      capa.push(
        <Entrada key={key} f={f} t0={t0} modo={e.entra} x={x} y={y} sale={sale}>
          <g transform={`translate(0 ${Math.sin((f + i * 20) / 16) * 4})`} filter="url(#sombraSuave)">
            <Persona h={h} piel={e.piel ?? i} ropa={e.ropa ?? i} gorro={(e.gorro ?? "gorra") as Gorro} cara={cara} f={f + i * 37} />
          </g>
          {e.etiqueta && <g transform="translate(0 46)"><Etiqueta texto={e.etiqueta.toUpperCase()} color={e.color ? COLOR(e.color) : T.K} size={34} /></g>}
        </Entrada>
      );
    } else if (e.que === "objeto") {
      const w = (W * (e.tam ?? 30)) / 100;
      capa.push(
        <Entrada key={key} f={f} t0={t0} modo={e.entra} x={x} y={y} sale={sale}>
          <g transform={`translate(0 ${Math.sin((f + i * 30) / 18) * 6}) rotate(${e.giro ?? 0})`} filter="url(#sombra)">{(OBJ2[e.objeto] ?? OBJ2.billete)({ w, f })}</g>
          {e.etiqueta && <g transform={`translate(0 ${w * 0.45 + 40})`}><Etiqueta texto={e.etiqueta.toUpperCase()} color={e.color ? COLOR(e.color) : T.K} size={32} /></g>}
        </Entrada>
      );
    } else if (e.que === "torre") {
      const t1 = at(c, e.hasta, t0 + 30), k = lin(f, t0, t1, 0, 1, eo);
      const hMax = (AH * (e.tam ?? 45)) / 100, prop = e.max ? Math.min(1, e.valor / e.max) : 1, cw = 170;
      const nMon = Math.max(1, (hMax * prop * k) / (cw * 0.13));
      const top = -nMon * cw * 0.13 - 40;
      if (f >= t0 - 2) {
        capa.push(
          <g key={key} transform={`translate(${x} ${y})`} opacity={1 - lin(f, sale, sale + 6)}>
            <Torre n={nMon} w={cw} color={e.color === "gris" ? T.G : T.A[0]} />
            {e.valor != null && <text y={top - 20} textAnchor="middle" fontFamily={F.cifra} fontSize={e.tamCifra ?? 64} fill={COLOR(e.color)}>{(e.prefijo ?? "$") + Math.round(e.valor * k).toLocaleString("en-US")}</text>}
            {e.etiqueta && <g transform="translate(0 50)"><Etiqueta texto={e.etiqueta.toUpperCase()} size={30} /></g>}
          </g>
        );
        sfx.push(...Array.from({ length: 5 }, (_, j) => <Sfx key={key + "c" + j} at={t0 + (j * (t1 - t0)) / 5} s="coins" v={0.1} />));
      }
    } else if (e.que === "cifra") {
      const t1 = e.contar ? at(c, e.hasta, t0 + 24) : t0;
      const k = e.contar ? lin(f, t0, t1, 0, 1, eio) : 1;
      const txt = e.contar && typeof e.valor === "number" ? (e.prefijo ?? "") + Math.round(e.valor * k).toLocaleString("en-US") + (e.sufijo ?? "") : String(e.texto ?? "");
      const fs0 = (AH * (e.tam ?? 13)) / 100, fs = Math.min(fs0, (W * 0.9) / Math.max(1, txt.length * 0.66));
      capa.push(
        <Entrada key={key} f={f} t0={t0} modo={e.entra} x={x} y={y} sale={sale}>
          <text textAnchor="middle" fontFamily={F.cifra} fontSize={fs} fill={COLOR(e.color)}>{txt}</text>
          {e.etiqueta && <text y={fs * 0.35 + 30} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={30} fill={T.K} letterSpacing={5}>{e.etiqueta.toUpperCase()}</text>}
        </Entrada>
      );
      if (e.contar) golpes.push(t1);
    } else if (e.que === "texto") {
      const fs = (AH * (e.tam ?? 4.5)) / 100;
      capa.push(
        <Entrada key={key} f={f} t0={t0} modo={e.entra} x={x} y={y} sale={sale}>
          {wrap(String(e.texto ?? ""), e.ancho ?? 18).map((l, j) => <text key={j} y={j * fs * 1.1} textAnchor="middle" fontFamily={F.texto} fontWeight={800} fontSize={fs} fill={COLOR(e.color ?? "tinta")}>{l}</text>)}
        </Entrada>
      );
    } else if (e.que === "globo") {
      const k = lin(f, t0, t0 + Math.max(10, (e.texto ?? "").length * 0.9));
      capa.push(<Entrada key={key} f={f} t0={t0} x={x} y={y} sale={sale}><Globo texto={e.texto ?? ""} k={k} piensa={!!e.piensa} cola={e.cola ?? -1} w={(W * (e.tam ?? 74)) / 100} /></Entrada>);
    } else if (e.que === "recibo") {
      capa.push(<Entrada key={key} f={f} t0={t0} modo="cae" x={x} y={y} sale={sale}><Recibo e={e} f={f} c={c} /></Entrada>);
      if (e.marca) { const m = at(c, e.marca.en, 1e9); sfx.push(<Sfx key={key + "m"} at={m} s="marcador" v={0.4} />); golpes.push(m + 8); }
      (e.renglones ?? []).forEach((r: P, j: number) => sfx.push(<Sfx key={key + "r" + j} at={at(c, r.en, 6 + j * 6)} s="paper" v={0.15} />));
    } else if (e.que === "celular") {
      capa.push(<Entrada key={key} f={f} t0={t0} modo={e.entra ?? "desliza"} x={x} y={y} sale={sale}><Celular e={e} f={f} t0={t0} /></Entrada>);
    } else if (e.que === "lista") {
      capa.push(<Entrada key={key} f={f} t0={t0} x={x} y={y} sale={sale}><Lista e={e} f={f} c={c} /></Entrada>);
      (e.items ?? []).forEach((it: P, j: number) => sfx.push(<Sfx key={key + "i" + j} at={at(c, it.en, 6 + j * 10)} s="ding" v={0.2} />));
    } else if (e.que === "grafica") {
      capa.push(<g key={key} transform={`translate(${x} ${y})`} opacity={lin(f, t0, t0 + 4)}>{f >= t0 && <Grafica e={e} f={f} c={c} t0={t0} />}</g>);
    } else if (e.que === "dinero" || e.que === "flecha") {
      const a = byId[e.de], b = byId[e.a]; if (!a || !b) return;
      const [x1, y1] = centro(a), [x2, y2] = centro(b);
      if (e.que === "flecha") {
        const k = lin(f, t0, t0 + 12, 0, 1, eo); if (k <= 0) return;
        const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 160, L = Math.hypot(x2 - x1, y2 - y1) * 1.3;
        capa.push(<path key={key} d={`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`} fill="none" stroke={T.K} strokeWidth={9} strokeLinecap="round" strokeDasharray={`${L} ${L}`} strokeDashoffset={L * (1 - k)} />);
      } else {
        const t1 = at(c, e.hasta, t0 + 40);
        for (let s = t0; s < t1; s += 5) {
          const q = lin(f, s, s + 18, 0, 1, eio); if (q <= 0 || q >= 1) continue;
          const bx = x1 + (x2 - x1) * q, by = y1 + (y2 - y1) * q - Math.sin(q * Math.PI) * 220;
          capa.push(<g key={key + s} transform={`translate(${bx} ${by}) rotate(${(q * 300 + s * 13) % 360}) scale(${0.55 + 0.2 * rnd(s)})`}>{(s / 5) % 2 ? <Billete w={170} /> : <Moneda r={34} />}</g>);
        }
        for (let s = t0; s < t1; s += 10) sfx.push(<Sfx key={key + "s" + s} at={s + 16} s="cash" v={0.1} />);
      }
    } else if (e.que === "tacha") {
      const b = byId[e.sobre]; if (!b) return;
      const [cx, cy] = centro(b), k = lin(f, t0, t0 + 8, 0, 1, eo), r = 130;
      if (k > 0) capa.push(<g key={key} transform={`translate(${cx} ${cy})`} stroke="#D9473A" strokeWidth={22} strokeLinecap="round"><path d={`M${-r} ${-r} L${-r + 2 * r * Math.min(1, k * 2)} ${-r + 2 * r * Math.min(1, k * 2)}`} />{k > 0.5 && <path d={`M${r} ${-r} L${r - 2 * r * (k * 2 - 1)} ${-r + 2 * r * (k * 2 - 1)}`} />}</g>);
      sfx.push(<Sfx key={key} at={t0} s="marcador" v={0.4} />); golpes.push(t0 + 6);
    } else if (e.que === "sello") {
      capa.push(<g key={key} transform={`translate(${x} ${y})`}><Sello texto={(e.texto ?? "").toUpperCase()} t={f - t0} w={(W * (e.tam ?? 66)) / 100} color={e.color === "verde" ? T.A[1] : "#D9473A"} /></g>);
      sfx.push(<Sfx key={key} at={t0} s="impact" v={0.5} />); golpes.push(t0 + 5);
    } else if (e.que === "check") {
      capa.push(<g key={key} transform={`translate(${x} ${y}) scale(${2.4 * sp(f, t0)})`}>{f >= t0 && <Check r={34} color={T.A[1]} />}</g>);
      sfx.push(<Sfx key={key} at={t0} s="ding" v={0.35} />);
    }
  });
  return { g: <g>{capa}</g>, sfx: <>{sfx}</>, golpes };
};
