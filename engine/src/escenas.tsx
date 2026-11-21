import React from "react";
import { F, T, W, H, Sfx, lin, eo, eio, sp, swing, rnd, money } from "./lib";
import { Alcancia, Banco, Calendario, Carita, Casa, Check, Escuela, Etiqueta, Hilo, Moneda, S, Sello, Tarjeta, Troca, Billete } from "./objetos";

/* Escenas tipo de EST-01. Cada escena recibe sus parámetros (del JSON del video), el frame local `f`
   y `c`: c.t(línea, palabra) = frame local en que se dice esa palabra; c.e(línea) = fin de la línea; c.d = duración. */
export type Ctx = { d: number; t: (line: number, word?: string | number, occ?: number) => number; e: (line: number) => number };
export type En = [number, (string | number)?];
export type Out = { g: React.ReactNode; sfx?: React.ReactNode; golpes?: number[]; oscuro?: boolean };
type P = Record<string, any>;
const at = (c: Ctx, en?: En, def = 0) => (en ? c.t(en[0], en[1]) : def);

const OBJ: Record<string, (props: any) => React.ReactElement> = {
  tarjeta: (p) => <Tarjeta {...p} />, alcancia: (p) => <Alcancia {...p} />, casa: (p) => <Casa {...p} />,
  troca: (p) => <Troca {...p} />, escuela: (p) => <Escuela {...p} />, banco: (p) => <Banco {...p} />,
  calendario: (p) => <Calendario {...p} />, billete: (p) => <Billete {...p} />, moneda: (p) => <Moneda {...p} />,
};
const Obj: React.FC<{ n: string; p?: P }> = ({ n, p = {} }) => (OBJ[n] ?? OBJ.tarjeta)(p);

/** Algo que cuelga de un hilo, cae con rebote y se balancea. */
/** Los hilos salen de un clavito debajo del texto (ANCLA), nunca cruzan las palabras. */
export const ANCLA = 390;
const Colgado: React.FC<{ f: number; d: number; x: number; y: number; hilo?: number; amp?: number; ancla?: number; children: React.ReactNode }> = ({ f, d, x, y, amp = 8, ancla = ANCLA, children }) => {
  if (f < d) return null;
  const k = sp(f, d, { damping: 9, stiffness: 120 });
  const yy = y - (1 - k) * 380;
  const op = lin(f, d, d + 5);
  const a = swing(f, d, amp * 0.6, 30) + Math.sin(f / 30) * 0.5;
  const L = yy - ancla;
  return (
    <g transform={`translate(${x} ${ancla}) rotate(${a})`} opacity={op}>
      {L > 0 && <path d={`M0 0 V${L}`} stroke={T.K} strokeWidth={4} />}
      {L > -40 && <circle r={9} fill={T.K} />}
      <g transform={`translate(0 ${L})`}>
        <circle r={9} fill={T.BL} stroke={T.K} strokeWidth={4} />
        {children}
      </g>
    </g>
  );
};

/** Barra de avance con su rótulo. */
const Barra: React.FC<{ x: number; y: number; w: number; k: number; izq: string; der?: string; color?: string; oscuro?: boolean }> = ({ x, y, w, k, izq, der, color = T.P, oscuro }) => (
  <g transform={`translate(${x} ${y})`}>
    <text y={-22} fontFamily={F.mono} fontWeight={500} fontSize={26} fill={oscuro ? T.B : T.G} letterSpacing={1}>{izq.toUpperCase()}</text>
    {der && <text x={w} y={-22} textAnchor="end" fontFamily={F.mono} fontWeight={700} fontSize={26} fill={color}>{der}</text>}
    <rect width={w} height={18} rx={9} fill={T.K} opacity={0.12} />
    <rect width={Math.max(18, w * k)} height={18} rx={9} fill={color} opacity={k > 0 ? 1 : 0} />
  </g>
);

const Cruz: React.FC<{ k: number }> = ({ k }) => (k <= 0 ? null : <g opacity={k} stroke={T.P} strokeWidth={14} strokeLinecap="round"><path d={`M-70 -70 L${-70 + 140 * Math.min(1, k * 2)} ${-70 + 140 * Math.min(1, k * 2)}`} /><path d={`M70 -70 L${70 - 140 * Math.max(0, k * 2 - 1)} ${-70 + 140 * Math.max(0, k * 2 - 1)}`} /></g>);

/* ---------- 1. ARMAR: un objeto se arma pieza por pieza, barra de avance y sello que cae ---------- */
const armar = (p: P, f: number, c: Ctx): Out => {
  const fin = at(c, p.armado, 30);
  const k = lin(f, 2, fin, 0, 1, eo);
  const ent = sp(f, 0);
  const sel = p.sello ? at(c, p.sello.en) : 9999;
  const flota = Math.sin(f / 20) * 6;
  const piezas = [0, 0.12, 0.25, 0.38, 0.46, 0.54, 0.62, 0.75, 0.86].map((x) => 2 + x * (fin - 2));
  return {
    golpes: [sel],
    g: (
      <g>
        <g transform={`translate(540 ${1000 + flota}) scale(${0.85 + 0.15 * ent}) rotate(${-4 + 4 * ent})`} filter="url(#sombra)">
          <Obj n={p.objeto} p={{ k, w: 720 }} />
        </g>
        <Barra x={180} y={1430} w={720} k={k} izq={p.barra ?? "avance"} der={k >= 1 ? "COMPLETO" : Math.round(k * 100) + "%"} />
        {k >= 1 && <g transform={`translate(925 1439) scale(${sp(f, fin)})`}><Check r={24} /></g>}
        <g transform="translate(560 1080)"><Sello texto={p.sello?.texto ?? ""} t={f - sel} w={640} /></g>
      </g>
    ),
    sfx: (
      <>
        {piezas.map((t, i) => <Sfx key={i} at={t} s="pop" v={0.18} />)}
        <Sfx at={fin} s="ding" v={0.3} />
        {p.sello && <Sfx at={sel} s="impact" v={0.55} />}
      </>
    ),
  };
};

/* ---------- 2. TABLERO: letras que giran hasta formar el nombre ---------- */
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const tablero = (p: P, f: number, c: Ctx): Out => {
  const filas: string[] = p.filas;
  const fin = at(c, p.en, 30);
  const max = Math.max(...filas.map((r) => r.length));
  const tile = Math.min(136, 880 / max), gap = 10, bw = max * (tile + gap) + 60, bh = filas.length * (tile * 1.25 + gap) + 60;
  const k = sp(f, 0, { damping: 10, stiffness: 110 });
  const y = 1060 - (1 - k) * 1400;
  const a = swing(f, 0, 5, 30);
  let idx = 0;
  const ticks: number[] = [];
  const tiles = filas.map((row, r) => row.split("").map((ch, i) => {
    const settle = Math.round(6 + ((idx++) / (filas.join("").length)) * Math.max(8, fin - 6));
    if (i % 2 === 0) ticks.push(settle);
    const shown = f >= settle || ch === " " ? ch : ABC[Math.floor(rnd(i * 13 + r * 7 + Math.floor(f / 2)) * ABC.length)];
    const flip = f < settle ? (f % 2) * 0.12 : 0;
    const x0 = -bw / 2 + 30 + (max - row.length) * (tile + gap) / 2 + i * (tile + gap), y0 = -bh / 2 + 30 + r * (tile * 1.25 + gap);
    return (
      <g key={`${r}-${i}`} transform={`translate(${x0} ${y0})`}>
        <rect width={tile} height={tile * 1.25} rx={8} fill="#2B2530" />
        <text x={tile / 2} y={tile * 0.95} textAnchor="middle" fontFamily={F.cifra} fontSize={tile * 0.92} fill={r === filas.length - 1 ? T.P : T.BL} transform={`scale(1 ${1 - flip})`} style={{ transformOrigin: `${tile / 2}px ${tile * 0.62}px` }}>{shown}</text>
        <path d={`M0 ${tile * 0.62} h${tile}`} stroke="#000" strokeWidth={3} opacity={0.6} />
      </g>
    );
  }));
  return {
    g: (
      <g transform={`translate(540 ${y}) rotate(${a})`}>
        {[-1, 1].map((s) => (390 - y < -bh / 2 ? <g key={s}><path d={`M${s * bw * 0.32} ${-bh / 2} L${s * bw * 0.3} ${390 - y}`} stroke={T.K} strokeWidth={4} /><circle cx={s * bw * 0.3} cy={390 - y} r={9} fill={T.K} /></g> : null))}
        <g filter="url(#sombra)">
          <rect x={-bw / 2} y={-bh / 2} width={bw} height={bh} rx={22} fill={T.K} {...S} />
          {tiles}
        </g>
        <text x={-bw / 2 + 26} y={-bh / 2 + 22} fontFamily={F.mono} fontSize={18} fill={T.G}>{p.rotulo ?? ""}</text>
      </g>
    ),
    sfx: <>{ticks.map((t, i) => <Sfx key={i} at={t} s="tick" v={0.22} />)}<Sfx at={0} s="whoosh" v={0.25} /></>,
  };
};

/* ---------- 3. CIFRA: número enorme que corre, con insignia colgando ---------- */
const cifra = (p: P, f: number, c: Ctx): Out => {
  const d0 = at(c, p.desde, 0), d1 = at(c, p.hasta, 24);
  const k = lin(f, d0, d1, 0, 1, eio);
  const v = (p.valor as number) * k;
  const vel = Math.abs(lin(f, d0, d1, 0, 1, eio) - lin(f - 1, d0, d1, 0, 1, eio)) * 60;
  const ins = p.insignia ? at(c, p.insignia.en) : 9999;
  const ent = sp(f, 0);
  return {
    golpes: [d1],
    g: (
      <g>
        {p.objeto && (
          <g transform={`translate(${300} ${760 + Math.sin(f / 18) * 8}) rotate(${-12 + Math.sin(f / 25) * 3}) scale(${0.72 * ent})`} filter="url(#sombra)">
            <Obj n={p.objeto} p={{ w: 460 }} />
          </g>
        )}
        <g transform={`translate(540 1220) scale(${0.7 + 0.3 * ent})`}>
          <text textAnchor="middle" fontFamily={F.cifra} fontSize={p.size ?? 290} fill={T.P} filter="url(#brillo)" style={{ filter: `blur(${Math.min(10, vel * 1.6)}px)` }}>{(p.prefijo ?? "") + Math.round(v).toLocaleString("en-US") + (p.sufijo ?? "")}</text>
          <text y={90} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={32} fill={T.K} letterSpacing={6}>{(p.etiqueta ?? "").toUpperCase()}</text>
        </g>
        {p.insignia && (
          f >= ins ? <g transform={`translate(760 1500) rotate(${-6 + swing(f, ins, 10, 20)}) scale(${sp(f, ins)})`}>
            <g filter="url(#sombra)"><Etiqueta texto={p.insignia.texto} color={T.P} size={46} /></g>
          </g> : null
        )}
      </g>
    ),
    sfx: <>{Array.from({ length: 8 }, (_, i) => <Sfx key={i} at={d0 + (i * (d1 - d0)) / 8} s="tick" v={0.12} />)}<Sfx at={d1} s="hit" v={0.4} />{p.insignia && <Sfx at={ins} s="whoosh2" v={0.25} />}</>,
  };
};

/* ---------- 4. TIEMPO: opción A con gafete, calendario que corre, barra y dinero que se va al banco ---------- */
const tiempo = (p: P, f: number, c: Ctx): Out => {
  const m0 = at(c, p.meses.desde, 10), m1 = at(c, p.meses.hasta, 40);
  const km = lin(f, m0, m1, 0, 1, eio);
  const banco = at(c, p.banco.en, 9999);
  const cnt = lin(f, banco + 4, banco + 40, 0, 1, eo);
  const monedas = [0, 1, 2, 3, 4, 5].map((i) => banco + 4 + i * 5);
  return {
    golpes: [m1, banco + 40],
    g: (
      <g>
        <Colgado f={f} d={0} x={300} y={720} hilo={1200} amp={7}>
          <g transform="scale(1.15)">
          <g filter="url(#sombra)">
            <rect x={-150} y={0} width={300} height={360} rx={20} fill={T.BL} {...S} />
            <path d="M-150 20 a20 20 0 0 1 20 -20 h260 a20 20 0 0 1 20 20 v60 h-300z" fill={T.P} {...S} />
            <text y={54} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={28} fill={T.BL}>{p.gafete.titulo}</text>
            <g transform="translate(0 165)"><Carita i={p.gafete.cara ?? 1} r={52} /></g>
            <text y={290} textAnchor="middle" fontFamily={F.cifra} fontSize={56} fill={T.K}>{p.gafete.texto}</text>
            <text y={330} textAnchor="middle" fontFamily={F.mono} fontSize={22} fill={T.G}>{p.gafete.sub}</text>
          </g>
          </g>
        </Colgado>
        <g transform={`translate(790 ${930 + Math.sin(f / 22) * 6}) rotate(5) scale(${1.12 * sp(f, 4)})`} filter="url(#sombra)">
          <Calendario w={290} titulo="MESES" n={String(Math.round(km * p.meses.total))} hoja={f > m0 && f < m1 ? (f % 6) / 6 : 0} />
        </g>
        <Barra x={150} y={1330} w={780} k={km} izq="tiempo para salir" der={km >= 1 ? p.meses.texto : ""} />
        {f >= banco && (
          <g>
            <g transform={`translate(800 ${1610}) scale(${0.85 * sp(f, banco)})`} filter="url(#sombra)"><Banco w={330} /></g>
            {monedas.map((t, i) => {
              const q = lin(f, t, t + 16, 0, 1, eio); if (q <= 0 || q >= 1) return null;
              const x = 300 + (760 - 300) * q, y = 1050 + (1540 - 1050) * q - Math.sin(q * Math.PI) * 260;
              return <g key={i} transform={`translate(${x} ${y}) rotate(${q * 360})`}><Moneda r={30} /></g>;
            })}
            <g transform="translate(330 1620)">
              <text textAnchor="middle" fontFamily={F.cifra} fontSize={128} fill={T.P}>{money(cnt * p.banco.valor)}</text>
              <text y={56} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={26} fill={T.K} letterSpacing={4}>{p.banco.etiqueta.toUpperCase()}</text>
            </g>
          </g>
        )}
      </g>
    ),
    sfx: (
      <>
        <Sfx at={0} s="whoosh2" v={0.25} />
        {Array.from({ length: 10 }, (_, i) => <Sfx key={i} at={m0 + (i * (m1 - m0)) / 10} s="paper" v={0.1} />)}
        <Sfx at={banco} s="pop" v={0.3} />
        {monedas.map((t, i) => <Sfx key={"m" + i} at={t + 14} s="coins" v={0.14} />)}
        <Sfx at={banco + 40} s="cash" v={0.3} />
      </>
    ),
  };
};

/* ---------- 5. COLGANTES: objetos que caen colgando de hilos, cada uno en su palabra ---------- */
const POS = [[300, 790], [770, 1060], [545, 1530], [800, 1500]];
const colgantes = (p: P, f: number, c: Ctx): Out => {
  const items: P[] = p.items;
  const ds = items.map((it) => at(c, it.en) - 3);
  const tachar = p.tachar ? at(c, p.tachar) : 9999;
  return {
    g: (
      <g>
        {items.map((it, i) => (
          <Colgado key={i} f={f} d={ds[i]} x={POS[i][0]} y={POS[i][1] - 170} amp={9}>
            <g transform="translate(0 170)">
              <g filter="url(#sombra)"><Obj n={it.objeto} p={{ w: (it.w ?? 300) * 1.3 }} /></g>
              <g transform={`translate(0 ${(it.etiquetaY ?? 175) * 1.3})`}><Etiqueta texto={it.etiqueta} size={32} /></g>
              <Cruz k={lin(f, tachar + i * 4, tachar + i * 4 + 8)} />
            </g>
          </Colgado>
        ))}
      </g>
    ),
    sfx: <>{ds.map((d, i) => <Sfx key={i} at={d} s="whoosh" v={0.22} />)}{ds.map((d, i) => <Sfx key={"b" + i} at={d + 8} s="boing" v={0.12} />)}</>,
  };
};

/* ---------- 6. COMPARATIVA: A contra B con barras ---------- */
const comparativa = (p: P, f: number, c: Ctx): Out => {
  const ent = sp(f, 0, { damping: 14 });
  const bIn = at(c, p.b.en, 10);
  const filas: P[] = p.filas;
  const x0 = 140, wMax = 680;
  const ganador = at(c, p.ganador?.en, 9999);
  return {
    golpes: [ganador],
    g: (
      <g transform={`translate(0 ${(1 - ent) * 200})`} opacity={ent}>
        <g filter="url(#sombra)"><rect x={90} y={620} width={900} height={940} rx={28} fill={T.BL} {...S} /></g>
        <g transform="translate(300 710)"><Etiqueta texto={p.a.texto} color={T.G} size={30} /></g>
        {f >= bIn && <g transform={`translate(760 710) scale(${sp(f, bIn)})`}><Etiqueta texto={p.b.texto} color={T.P} size={30} /></g>}
        {filas.map((r, i) => {
          const y = 860 + i * 300;
          const kb = lin(f, at(c, r.en, 20), at(c, r.en, 20) + 22, 0, 1, eo);
          const wa = wMax, wb = (wMax * r.b) / r.a;
          return (
            <g key={i}>
              <text x={x0} y={y} fontFamily={F.mono} fontWeight={700} fontSize={28} fill={T.K} letterSpacing={3}>{r.titulo.toUpperCase()}</text>
              <rect x={x0} y={y + 30} width={wa * lin(f, 4 + i * 6, 20 + i * 6, 0, 1, eo)} height={64} rx={12} fill={T.G} {...S} />
              <text x={x0 + 24} y={y + 74} fontFamily={F.cifra} fontSize={36} fill={T.BL}>{r.textoA}</text>
              {kb > 0 && <rect x={x0} y={y + 120} width={Math.max(40, wb * kb)} height={64} rx={12} fill={T.P} {...S} />}
              {kb > 0.6 && <text x={x0 + Math.max(40, wb * kb) + 20} y={y + 164} fontFamily={F.cifra} fontSize={40} fill={T.P}>{r.textoB}</text>}
            </g>
          );
        })}
        {p.ganador && <g transform="translate(540 1455)"><Sello texto={p.ganador.texto} t={f - ganador} w={700} rot={-5} /></g>}
      </g>
    ),
    sfx: <><Sfx at={bIn} s="pop" v={0.3} />{filas.map((r, i) => <Sfx key={i} at={at(c, r.en, 20)} s="whoosh2" v={0.2} />)}{p.ganador && <Sfx at={ganador} s="impact" v={0.5} />}</>,
  };
};

/* ---------- 7. PASOS: varias tarjetas colgando, se elige una y el ahorro cae a la alcancía ---------- */
const pasos = (p: P, f: number, c: Ctx): Out => {
  const tasas: string[] = p.tasas;
  const elegida: number = p.elegida;
  const sel = at(c, p.elegir, 9999), alc = at(c, p.alcancia, 9999);
  const xs = [200, 540, 880];
  return {
    golpes: [sel],
    g: (
      <g>
        {tasas.map((t, i) => {
          const es = i === elegida, k = lin(f, sel, sel + 8, 0, 1, eo);
          const sc = es ? 1 + 0.18 * k : 1 - 0.12 * k;
          return (
            <Colgado key={i} f={f} d={i * 4} x={xs[i]} y={680} amp={7}>
              <g transform={`translate(0 150) scale(${sc})`} opacity={es ? 1 : 1 - 0.55 * k}>
                <g transform="rotate(90)" filter="url(#sombra)"><Tarjeta w={370} color={es ? T.K : "#4A4450"} /></g>
                <g transform="translate(0 225)"><Etiqueta texto={t} color={es && k > 0 ? T.P : T.K} size={34} /></g>
              </g>
              {es && f >= sel && <g transform={`translate(95 20) scale(${sp(f, sel)})`}><Etiqueta texto={p.primero ?? "1º"} color={T.A[0]} tinta={T.K} size={30} /></g>}
            </Colgado>
          );
        })}
        {f >= alc && (
          <g>
            <g transform={`translate(540 1560) scale(${1.05 * sp(f, alc)})`} filter="url(#sombra)"><Alcancia w={330} llena={lin(f, alc + 10, alc + 40)} /></g>
            {[0, 1, 2, 3].map((i) => {
              const t0 = alc + 6 + i * 6, q = lin(f, t0, t0 + 14, 0, 1, eio); if (q <= 0 || q >= 1) return null;
              return <g key={i} transform={`translate(${540 + (i - 1.5) * 10} ${1260 + q * 200})`}><Moneda r={28} /></g>;
            })}
          </g>
        )}
      </g>
    ),
    sfx: <>{tasas.map((_, i) => <Sfx key={i} at={i * 4} s="whoosh" v={0.15} />)}<Sfx at={sel} s="ding" v={0.35} /><Sfx at={alc} s="pop" v={0.3} />{[0, 1, 2, 3].map((i) => <Sfx key={"c" + i} at={alc + 18 + i * 6} s="coins" v={0.14} />)}</>,
  };
};

/* ---------- 8. OSCURA: clímax con reflector, cifra y objeto que cae del cielo ---------- */
const oscura = (p: P, f: number, c: Ctx): Out => {
  const num = at(c, p.cifra.en, 6), cae = at(c, p.cae.en, 30) - 4;
  const kc = sp(f, cae, { damping: 8, stiffness: 140 });
  const luz = lin(f, 0, 10);
  const prende = f - cae - 8;
  return {
    oscuro: true,
    golpes: [cae + 8],
    g: (
      <g>
        <rect width={W} height={H} fill={T.K} />
        <defs>
          <linearGradient id="haz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity={0.05} /><stop offset="1" stopColor="#fff" stopOpacity={0.22} /></linearGradient>
        </defs>
        <path d="M480 0 L600 0 L900 1560 L180 1560 Z" fill="url(#haz)" opacity={luz} />
        <ellipse cx={540} cy={1560} rx={380} ry={50} fill="#fff" opacity={0.12 * luz} />
        {Array.from({ length: 26 }, (_, i) => (
          <circle key={i} cx={260 + rnd(i) * 560} cy={((rnd(i + 50) * 1500 + f * (0.4 + rnd(i + 9))) % 1500) + 60} r={1.5 + rnd(i + 3) * 2.5} fill="#fff" opacity={0.25 + 0.4 * rnd(i + 7)} />
        ))}
        {f >= num && (
          <g transform={`translate(540 ${640 - lin(f, cae, cae + 12, 0, 60)}) scale(${sp(f, num)})`}>
            <text textAnchor="middle" fontFamily={F.cifra} fontSize={200} fill={T.A[0]} filter="url(#brillo)">{p.cifra.texto}</text>
            <text y={70} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={30} fill={T.B} letterSpacing={6}>{(p.cifra.etiqueta ?? "").toUpperCase()}</text>
          </g>
        )}
        {f >= cae && (
          <g transform={`translate(540 ${-400 + (1330 + 400) * kc})`}>
            <g filter="url(#sombra)"><Obj n={p.cae.objeto} p={{ w: 460, luz: lin(prende, 0, 6) }} /></g>
            {prende >= 0 && (
              <g transform="translate(0 260)">
                <rect x={-230} y={-62} width={460} height={124} rx={14} fill="#2B2530" stroke={T.A[0]} strokeWidth={8} />
                {Array.from({ length: 14 }, (_, i) => <circle key={i} cx={-210 + i * 32.3} cy={-62} r={6} fill={T.A[0]} opacity={(Math.floor(f / 4) + i) % 2 ? 1 : 0.35} />)}
                {Array.from({ length: 14 }, (_, i) => <circle key={"b" + i} cx={-210 + i * 32.3} cy={62} r={6} fill={T.A[0]} opacity={(Math.floor(f / 4) + i) % 2 ? 0.35 : 1} />)}
                <text y={24} textAnchor="middle" fontFamily={F.cifra} fontSize={68} fill={T.A[0]} letterSpacing={10} opacity={lin(prende, 0, 4)} filter="url(#brillo)">{p.cae.letrero}</text>
              </g>
            )}
            {prende >= 0 && prende < 30 && [0, 1, 2, 3, 4, 5].map((i) => {
              const a = (i / 6) * Math.PI * 2, r = 260 + prende * 6;
              return <path key={i} d="M0 -14 L4 -4 L14 0 L4 4 L0 14 L-4 4 L-14 0 L-4 -4 Z" fill={T.A[0]} transform={`translate(${Math.cos(a) * r} ${Math.sin(a) * r * 0.6 - 60}) scale(${1 - prende / 30})`} />;
            })}
          </g>
        )}
      </g>
    ),
    sfx: <><Sfx at={0} s="subdrop" v={0.35} /><Sfx at={num} s="riser" v={0.18} /><Sfx at={cae + 8} s="impact" v={0.45} /><Sfx at={cae + 10} s="ding" v={0.3} /></>,
  };
};

/* ---------- 9. CIERRE: tarjeta de perfil, botón de seguir, corazón y compartir ---------- */
const cierre = (p: P, f: number, c: Ctx): Out => {
  const ent = sp(f, 2, { damping: 12 });
  const toca = at(c, p.seguir, 12) + 8;
  const sig = f >= toca;
  const press = f >= toca - 3 && f < toca + 3 ? 0.93 : 1;
  const comp = at(c, p.compartir, 9999);
  const iconos = [comp, comp + 5, comp + 10];
  return {
    g: (
      <g>
        <g transform={`translate(540 ${1000 + (1 - ent) * 500}) scale(1.12)`}>
          <g filter="url(#sombra)"><rect x={-400} y={-300} width={800} height={600} rx={36} fill={T.BL} {...S} /></g>
          <g transform="translate(0 -170)">
            <circle r={96} fill={T.P} {...S} />
            <g transform="translate(0 14) scale(0.36)"><Casa w={360} color={T.BL} /></g>
          </g>
          <text y={-16} textAnchor="middle" fontFamily={F.texto} fontWeight={800} fontSize={60} fill={T.K}>{p.nombre}</text>
          <text y={36} textAnchor="middle" fontFamily={F.mono} fontSize={26} fill={T.G}>{p.sub}</text>
          <g transform={`translate(0 170) scale(${press})`}>
            <rect x={-300} y={-58} width={600} height={116} rx={58} fill={sig ? T.K : T.P} {...S} />
            <text y={20} textAnchor="middle" fontFamily={F.texto} fontWeight={800} fontSize={50} fill={T.BL}>{sig ? "Siguiendo ✓" : "Seguir"}</text>
          </g>
          {f >= toca - 10 && f < toca + 14 && (
            <g transform={`translate(${200 - lin(f, toca - 10, toca - 2, -120, 0, eo)} ${260 - lin(f, toca - 10, toca - 2, -120, 0, eo)})`}>
              <circle r={lin(f, toca - 2, toca + 10, 10, 70)} fill="none" stroke={T.P} strokeWidth={5} opacity={lin(f, toca, toca + 12, 1, 0)} />
              <path d="M0 0 l18 54 l10 -22 l24 -6 z" fill={T.BL} stroke={T.K} strokeWidth={5} strokeLinejoin="round" />
            </g>
          )}
        </g>
        {[0, 1, 2].map((i) => {
          if (f < iconos[i]) return null;
          const s = sp(f, iconos[i]), x = 340 + i * 200;
          return (
            <g key={i} transform={`translate(${x} 1560) scale(${s})`} filter="url(#sombraSuave)">
              <circle r={70} fill={i === 0 ? T.P : T.BL} {...S} />
              {i === 0 && <path d="M0 26 C-50 -6 -34 -46 -10 -36 C-2 -32 0 -24 0 -22 C0 -24 2 -32 10 -36 C34 -46 50 -6 0 26 Z" fill={T.BL} stroke={T.K} strokeWidth={4} />}
              {i === 1 && <path d="M-34 -24 h68 a8 8 0 0 1 8 8 v34 a8 8 0 0 1 -8 8 h-40 l-20 16 v-16 h-8 a8 8 0 0 1 -8 -8 v-34 a8 8 0 0 1 8 -8 z" fill={T.BL} {...S} strokeWidth={4} />}
              {i === 2 && <path d="M-30 20 C-30 -10 -8 -20 18 -20 v-16 l30 26 l-30 26 v-16 C-4 0 -22 6 -30 20 Z" fill={T.A[0]} {...S} strokeWidth={4} />}
            </g>
          );
        })}
        {f >= comp && f < comp + 30 && Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2, r = 70 + (f - comp) * 5;
          return <circle key={i} cx={340 + Math.cos(a) * r} cy={1560 + Math.sin(a) * r} r={8 * (1 - (f - comp) / 30)} fill={T.P} />;
        })}
      </g>
    ),
    sfx: <><Sfx at={0} s="whoosh" v={0.25} /><Sfx at={toca} s="clic_boton" v={0.45} /><Sfx at={toca + 2} s="ding" v={0.25} />{iconos.map((t, i) => <Sfx key={i} at={t} s={i === 0 ? "heart" : "pop"} v={0.3} />)}</>,
  };
};

export const ESCENAS: Record<string, (p: P, f: number, c: Ctx) => Out> = { armar, tablero, cifra, tiempo, colgantes, comparativa, pasos, oscura, cierre };
