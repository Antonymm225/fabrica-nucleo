import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Defs, F, FPS, H, T, W, clamp, lin, rnd, eio } from "./lib";
import { ESCENAS, type Ctx, type En } from "./escenas";
import VOJ from "./video/vo.json";
import VID from "./video/escenas.json";

type Word = { w: string; s: number; e: number; line: number };
type VO = { dur: number; words: Word[]; lines: { s: number; e: number; text: string }[] };
type Contador = string | { en: En; texto: string }[];
type Esc = { tipo: string; desde: En; capitulo: string; contador?: Contador; entrada?: "destello" | "cuadritos" | "ola" | "corte"; [k: string]: any };

const vo = VOJ as unknown as VO;
type Visual = { paleta?: number; fondo?: "cruces" | "puntos" | "rayas" | "cuadricula" | "liso"; clave?: "serif" | "negra" };
const vid = VID as unknown as { escenas: Esc[]; aviso?: string; musica?: string; visual?: Visual };
const VIS: Visual = vid.visual ?? {};
export const TOTAL = Math.ceil((vo.dur + 0.4) * FPS);

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9$%]/g, "");
export const wordFrame = (line: number, word?: string | number, occ = 0) => {
  const ws = vo.words.filter((w) => w.line === line);
  if (!ws.length) throw new Error(`línea ${line} no existe`);
  if (word === undefined) return Math.round(ws[0].s * FPS);
  if (typeof word === "number") return Math.round(ws[Math.min(word, ws.length - 1)].s * FPS);
  const k = norm(word); const hits = ws.filter((w) => norm(w.w).includes(k));
  if (!hits.length) throw new Error(`palabra "${word}" no está en la línea ${line}: ${vo.lines[line].text}`);
  return Math.round(hits[Math.min(occ, hits.length - 1)].s * FPS);
};
const starts = vid.escenas.map((s, i) => (i === 0 ? 0 : wordFrame(s.desde[0], s.desde[1]) - 3));

/* ---------- Fondo: papel con grano y un motivo que cambia por video (cruces, puntos, rayas, cuadrícula o liso) ---------- */
const Fondo: React.FC<{ seed: number; f: number }> = ({ seed, f }) => {
  const m = VIS.fondo ?? "cruces", dy = -f * 0.15;
  let motivo: React.ReactNode = null;
  if (m === "cruces") motivo = Array.from({ length: 30 }, (_, i) => {
    const x = rnd(i + seed * 31) * W, y = 200 + rnd(i * 3 + seed * 17) * (H - 260) + dy, s = 9 + rnd(i + 5) * 6;
    return <path key={i} d={`M${x - s} ${y - s}L${x + s} ${y + s}M${x + s} ${y - s}L${x - s} ${y + s}`} stroke={T.P} strokeWidth={3} opacity={0.32} />;
  });
  if (m === "puntos") motivo = Array.from({ length: 12 * 22 }, (_, k) => {
    const cx = k % 12, cy = Math.floor(k / 12), x = 45 + cx * 90 + (cy % 2) * 45, y = 40 + cy * 90 + (dy % 90);
    return <circle key={k} cx={x} cy={y} r={4.5} fill={T.P} opacity={0.22} />;
  });
  if (m === "rayas") motivo = Array.from({ length: 34 }, (_, k) => {
    const x = -H + k * 90 + (seed * 23) % 90;
    return <path key={k} d={`M${x} ${H}L${x + H} 0`} stroke={T.P} strokeWidth={14} opacity={0.07} />;
  });
  if (m === "cuadricula") motivo = (
    <g opacity={0.16} stroke={T.P} strokeWidth={2}>
      {Array.from({ length: 13 }, (_, k) => <path key={"v" + k} d={`M${k * 90} 0V${H}`} />)}
      {Array.from({ length: 23 }, (_, k) => <path key={"h" + k} d={`M0 ${k * 90 + (dy % 90)}H${W}`} />)}
    </g>
  );
  return (
    <g>
      <rect width={W} height={H} fill={T.B} />
      <rect width={W} height={H} filter="url(#grano)" />
      {motivo}
    </g>
  );
};

/* ---------- Franja de capítulo ---------- */
const Franja: React.FC<{ e: Esc; f: number; oscuro: boolean }> = ({ e, f, oscuro }) => {
  let cont = "";
  if (typeof e.contador === "string") cont = e.contador;
  else if (Array.isArray(e.contador)) for (const x of e.contador) if (f >= wordFrame(x.en[0], x.en[1])) cont = x.texto;
  const [a, b] = cont.includes("|") ? cont.split("|") : ["", cont];
  return (
    <div style={{ position: "absolute", top: 70, left: 84, right: 84, display: "flex", justifyContent: "space-between", fontFamily: F.mono, fontSize: 25, letterSpacing: 1.5, color: oscuro ? "#8d8790" : T.G }}>
      <span>{e.capitulo.toLowerCase()}</span>
      <span>{a.toUpperCase()}<span style={{ color: T.P, fontWeight: 700 }}>{b.toUpperCase()}</span></span>
    </div>
  );
};

/* ---------- Texto palabra por palabra (la palabra clave en cursiva de color) ---------- */
const Texto: React.FC<{ f: number; oscuro: boolean }> = ({ f, oscuro }) => {
  const t = f / FPS;
  let li = -1;
  for (let i = 0; i < vo.lines.length; i++) if (t >= vo.lines[i].s - 0.05) li = i;
  if (li < 0) return null;
  const next = vo.lines[li + 1];
  if (next && t >= next.s - 0.05) return null;
  const ws = vo.words.filter((w) => w.line === li);
  let clave = false;
  const negra = VIS.clave === "negra";
  const tinta = oscuro ? T.B : T.K, gris = oscuro ? "#77727a" : "#B3AEA6";
  return (
    <div style={{ position: "absolute", top: 150, left: 84, right: 110, display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 20, rowGap: 0, lineHeight: 1.12 }}>
      {ws.map((w, i) => {
        let txt = w.w;
        const abre = txt.startsWith("*"); if (abre) { clave = true; txt = txt.slice(1); }
        const esClave = clave;
        if (/\*[.,;:!?]*$/.test(txt)) { clave = false; txt = txt.replace("*", ""); }
        const fs = Math.round(w.s * FPS), fe = Math.max(fs + 3, Math.round(w.e * FPS));
        if (f < fs - 1) return null;
        const op = lin(f, fs - 1, fs + 2);
        const k = lin(f, fs, fe, 0, 1, eio);
        const col = esClave ? T.P : interpolate(k, [0, 1], [0, 1]) < 1 ? mix(gris, tinta, k) : tinta;
        return (
          <span key={i} style={{
            opacity: esClave ? op * (0.45 + 0.55 * k) : op,
            color: col,
            fontFamily: esClave ? (negra ? F.texto : F.clave) : F.texto,
            fontStyle: esClave && !negra ? "italic" : "normal",
            fontWeight: esClave ? (negra ? 800 : 400) : 500,
            fontSize: esClave ? (negra ? 80 : 92) : 76,
            letterSpacing: esClave ? (negra ? -1.5 : 0) : -0.8,
            transform: `translateY(${(1 - op) * 10}px)`,
            display: "inline-block",
          }}>{txt}</span>
        );
      })}
    </div>
  );
};
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, k: number) => { const A = hex(a), B = hex(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * k)).join(",")})`; };

/* ---------- Transiciones ---------- */
const Transicion: React.FC<{ f: number }> = ({ f }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
    {vid.escenas.map((e, i) => {
      const s = starts[i];
      if (i === 0 || Math.abs(f - s) > 14) return null;
      if (e.entrada === "destello") return f >= s && f < s + 3 ? <rect key={i} width={W} height={H} fill={T.K} opacity={f < s + 2 ? 1 : 0.5} /> : null;
      if (e.entrada === "cuadritos") {
        const cols = 9, rows = 16, sz = W / cols;
        return (
          <g key={i}>
            {Array.from({ length: cols * rows }, (_, k) => {
              const cx = k % cols, cy = Math.floor(k / cols), del = ((cx + cy) / (cols + rows)) * 6;
              const q = f < s ? lin(f, s - 7 + del * 0.6, s - 2 + del * 0.6) : 1 - lin(f, s + del, s + 6 + del);
              if (q <= 0) return null;
              return <rect key={k} x={cx * sz + (sz * (1 - q)) / 2} y={cy * sz + (sz * (1 - q)) / 2} width={sz * q} height={sz * q} fill={(cx + cy) % 2 ? T.P : T.B} />;
            })}
          </g>
        );
      }
      if (e.entrada === "ola") {
        const top = f < s ? lin(f, s - 8, s, H, -80, eio) : -80;
        const bot = f < s ? H + 200 : lin(f, s, s + 10, H + 200, -120, eio);
        if (bot <= top) return null;
        const wv = (y: number, ph: number) => Array.from({ length: 13 }, (_, k) => `${k === 0 ? "M" : "L"}${(k / 12) * W} ${y + Math.sin(k * 0.9 + f * 0.4 + ph) * 26}`).join(" ");
        return <path key={i} d={`${wv(top, 0)} L${W} ${bot} L0 ${bot} Z`} fill={T.P} />;
      }
      return null;
    })}
  </svg>
);

/* ---------- Escena con cámara y golpes ---------- */
const Escena: React.FC<{ e: Esc; i: number; start: number; dur: number }> = ({ e, i, start, dur }) => {
  const f = useCurrentFrame();
  const c: Ctx = { d: dur, t: (l, w, o) => wordFrame(l, w, o) - start, e: (l) => Math.round(vo.lines[l].e * FPS) - start };
  const out = (ESCENAS[e.tipo] ?? ESCENAS.armar)(e, f, c);
  const z = interpolate(f, [0, dur], [1, 1.035], clamp);
  const sh = (out.golpes ?? []).reduce((a, p) => a + (f >= p && f < p + 9 ? (9 - (f - p)) * 2.2 : 0), 0);
  const sx = Math.sin(f * 2.3) * sh, sy = Math.cos(f * 3.1) * sh;
  const oscuro = !!out.oscuro;
  return (
    <AbsoluteFill>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <Defs />
        {!oscuro && <Fondo seed={i} f={f} />}
        <g transform={`translate(${sx} ${sy}) translate(540 1000) scale(${z}) translate(-540 -1000)`}>{out.g}</g>
      </svg>
      <Franja e={e} f={f + start} oscuro={oscuro} />
      <Texto f={f + start} oscuro={oscuro} />
      {vid.aviso && <div style={{ position: "absolute", bottom: 56, left: 60, right: 60, textAlign: "center", fontFamily: F.texto, fontSize: 22, color: oscuro ? "#8d8790" : T.G }}>{vid.aviso}</div>}
      {out.sfx}
    </AbsoluteFill>
  );
};

export const Main: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: T.B }}>
      {vid.escenas.map((e, i) => {
        const s = starts[i], d = (i + 1 < starts.length ? starts[i + 1] : TOTAL) - s;
        return <Sequence key={i} from={s} durationInFrames={d}><Escena e={e} i={i} start={s} dur={d} /></Sequence>;
      })}
      <Transicion f={f} />
      <Audio src={staticFile("video/vo.wav")} />
      {vid.musica && <Audio src={staticFile(`music/${vid.musica}.mp3`)} volume={(fr) => 0.07 * interpolate(fr, [0, 15, TOTAL - 30, TOTAL], [0, 1, 1, 0], clamp)} />}
    </AbsoluteFill>
  );
};
