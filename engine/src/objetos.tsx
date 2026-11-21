import React from "react";
import { F, T } from "./lib";

/** Biblioteca de objetos de EST-01: ilustración plana, contorno grueso y sombra dura.
 *  Todos se dibujan centrados en (0,0). `k` (0..1) = cuánto está armado (para escenas que lo arman pieza por pieza). */
export const S = { stroke: T.K, strokeWidth: 6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const backOut = (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return t <= 0 ? 0 : t >= 1 ? 1 : 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; };
/** Escala de una pieza que aparece cuando k pasa por `at`. */
const pz = (k: number, at: number, len = 0.12) => backOut(Math.max(0, Math.min(1, (k - at) / len)));
const Pieza: React.FC<{ k: number; at: number; x: number; y: number; children: React.ReactNode }> = ({ k, at, x, y, children }) => {
  const s = pz(k, at);
  return s <= 0 ? null : <g transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`}>{children}</g>;
};

export const Tarjeta: React.FC<{ k?: number; w?: number; color?: string; texto?: string }> = ({ k = 1, w = 460, color = T.K, texto }) => {
  const h = w * 0.63, x0 = -w / 2, y0 = -h / 2;
  return (
    <g>
      <Pieza k={k} at={0} x={0} y={0}><rect x={x0} y={y0} width={w} height={h} rx={28} fill={color} {...S} /></Pieza>
      <Pieza k={k} at={0.12} x={0} y={y0 + h * 0.3}><rect x={x0} y={y0 + h * 0.22} width={w} height={h * 0.13} fill={T.P} stroke="none" /></Pieza>
      <Pieza k={k} at={0.25} x={x0 + w * 0.17} y={y0 + h * 0.52}>
        <rect x={x0 + w * 0.08} y={y0 + h * 0.43} width={w * 0.17} height={h * 0.19} rx={8} fill={T.A[0]} stroke={T.K} strokeWidth={4} />
        <path d={`M${x0 + w * 0.08} ${y0 + h * 0.525}h${w * 0.17}M${x0 + w * 0.165} ${y0 + h * 0.43}v${h * 0.19}`} stroke={T.K} strokeWidth={3} />
      </Pieza>
      {[0, 1, 2, 3].map((g) => (
        <Pieza key={g} k={k} at={0.38 + g * 0.08} x={x0 + w * (0.17 + g * 0.21)} y={y0 + h * 0.75}>
          {[0, 1, 2, 3].map((d) => <circle key={d} cx={x0 + w * (0.09 + g * 0.21) + d * w * 0.04} cy={y0 + h * 0.75} r={w * 0.011} fill={T.BL} />)}
        </Pieza>
      ))}
      <Pieza k={k} at={0.75} x={x0 + w * 0.2} y={y0 + h * 0.88}><rect x={x0 + w * 0.08} y={y0 + h * 0.86} width={w * 0.3} height={h * 0.035} rx={4} fill={T.G} /></Pieza>
      <Pieza k={k} at={0.86} x={x0 + w * 0.82} y={y0 + h * 0.84}>
        <circle cx={x0 + w * 0.79} cy={y0 + h * 0.84} r={w * 0.06} fill={T.P} stroke={T.K} strokeWidth={4} />
        <circle cx={x0 + w * 0.86} cy={y0 + h * 0.84} r={w * 0.06} fill={T.A[0]} stroke={T.K} strokeWidth={4} opacity={0.92} />
      </Pieza>
      {texto && k >= 0.95 && <text x={x0 + w * 0.92} y={y0 + h * 0.15} textAnchor="end" fontFamily={F.mono} fontWeight={700} fontSize={w * 0.06} fill={T.BL}>{texto}</text>}
    </g>
  );
};

export const Alcancia: React.FC<{ w?: number; color?: string; llena?: number }> = ({ w = 300, color = T.P, llena = 0 }) => {
  const s = w / 300;
  return (
    <g transform={`scale(${s})`}>
      {[-80, -30, 30, 80].map((x, i) => <rect key={i} x={x - 18} y={70} width={36} height={52} rx={10} fill={color} {...S} />)}
      <path d="M150 -10 q40 -10 30 25 q-10 25 -30 5" fill="none" {...S} />
      <ellipse cx={0} cy={10} rx={150} ry={110} fill={color} {...S} />
      {llena > 0 && <ellipse cx={0} cy={10} rx={150 * 0.82} ry={110 * 0.8 * llena} fill={T.A[0]} opacity={0.35} />}
      <path d="M-70 -80 l-10 -55 l55 30 z" fill={color} {...S} />
      <ellipse cx={-152} cy={20} rx={32} ry={40} fill={color} {...S} />
      <circle cx={-158} cy={8} r={6} fill={T.K} /><circle cx={-158} cy={32} r={6} fill={T.K} />
      <circle cx={-90} cy={-20} r={10} fill={T.K} />
      <rect x={-35} y={-102} width={70} height={14} rx={7} fill={T.K} />
      <path d="M-40 40 q30 20 60 0" fill="none" stroke={T.K} strokeWidth={5} opacity={0.35} />
    </g>
  );
};

export const Casa: React.FC<{ w?: number; color?: string; luz?: number }> = ({ w = 360, color = T.P, luz = 1 }) => {
  const s = w / 360;
  return (
    <g transform={`scale(${s})`}>
      <rect x={80} y={-200} width={44} height={80} fill={T.BL} {...S} />
      <rect x={-150} y={-60} width={300} height={220} fill={T.BL} {...S} />
      <path d="M-185 -50 L0 -205 L185 -50 Z" fill={color} {...S} />
      <rect x={-35} y={50} width={70} height={110} rx={6} fill={T.K} {...S} />
      <circle cx={22} cy={108} r={6} fill={T.A[0]} />
      {[-100, 100].map((x) => (
        <g key={x}>
          <rect x={x - 38} y={-10} width={76} height={70} rx={6} fill={T.A[0]} fillOpacity={0.35 + 0.65 * luz} {...S} />
          <path d={`M${x} -10v70M${x - 38} 25h76`} stroke={T.K} strokeWidth={4} />
        </g>
      ))}
    </g>
  );
};

export const Troca: React.FC<{ w?: number; color?: string }> = ({ w = 420, color = T.A[2] }) => {
  const s = w / 420;
  return (
    <g transform={`scale(${s})`}>
      <path d="M-200 30 L-200 -30 L-10 -30 L-10 -110 L110 -110 L170 -40 L205 -30 L205 60 L-200 60 Z" fill={color} {...S} />
      <path d="M10 -95 L100 -95 L148 -40 L10 -40 Z" fill={T.BL} {...S} />
      <path d="M-200 -30 h190" stroke={T.K} strokeWidth={6} />
      <rect x={-185} y={-18} width={160} height={16} rx={4} fill={T.K} opacity={0.25} />
      <rect x={190} y={-15} width={22} height={18} rx={4} fill={T.A[0]} {...S} />
      <path d="M60 0h30" stroke={T.K} strokeWidth={6} />
      {[-120, 120].map((x) => (
        <g key={x}><circle cx={x} cy={62} r={46} fill={T.K} /><circle cx={x} cy={62} r={20} fill={T.G} stroke={T.K} strokeWidth={4} /></g>
      ))}
    </g>
  );
};

export const Escuela: React.FC<{ w?: number; color?: string }> = ({ w = 380, color = T.P }) => {
  const s = w / 380;
  return (
    <g transform={`scale(${s})`}>
      <path d="M0 -250 v-70" stroke={T.K} strokeWidth={6} />
      <path d="M0 -320 h60 l-12 18 l12 18 h-60 z" fill={T.A[0]} {...S} />
      <rect x={-190} y={-80} width={380} height={230} fill={T.BL} {...S} />
      <path d="M-120 -80 L0 -230 L120 -80 Z" fill={color} {...S} />
      <circle cx={0} cy={-125} r={32} fill={T.BL} {...S} />
      <path d="M0 -125 v-18 M0 -125 h14" stroke={T.K} strokeWidth={5} />
      <rect x={-40} y={50} width={80} height={100} rx={6} fill={T.K} {...S} />
      {[-140, -85, 85, 140].map((x) => <rect key={x} x={x - 22} y={-40} width={44} height={56} rx={5} fill={T.A[2]} fillOpacity={0.55} {...S} />)}
      {[-140, -85, 85, 140].map((x) => <rect key={x + "b"} x={x - 22} y={50} width={44} height={56} rx={5} fill={T.A[2]} fillOpacity={0.55} {...S} />)}
      <rect x={-210} y={150} width={420} height={20} fill={T.G} {...S} />
    </g>
  );
};

export const Banco: React.FC<{ w?: number }> = ({ w = 360 }) => {
  const s = w / 360;
  return (
    <g transform={`scale(${s})`}>
      <path d="M-180 -80 L0 -190 L180 -80 Z" fill={T.BL} {...S} />
      <text x={0} y={-105} textAnchor="middle" fontFamily={F.cifra} fontSize={34} fill={T.K}>BANCO</text>
      <rect x={-170} y={-80} width={340} height={26} fill={T.G} {...S} />
      {[-120, -40, 40, 120].map((x) => <rect key={x} x={x - 20} y={-54} width={40} height={170} fill={T.BL} {...S} />)}
      <rect x={-190} y={116} width={380} height={26} fill={T.G} {...S} />
      <rect x={-210} y={142} width={420} height={24} fill={T.BL} {...S} />
    </g>
  );
};

export const Moneda: React.FC<{ r?: number }> = ({ r = 34 }) => (
  <g>
    <circle r={r} fill={T.A[0]} {...S} strokeWidth={5} />
    <circle r={r * 0.7} fill="none" stroke={T.K} strokeWidth={3} opacity={0.4} />
    <text y={r * 0.36} textAnchor="middle" fontFamily={F.cifra} fontSize={r * 1.05} fill={T.K}>$</text>
  </g>
);

export const Billete: React.FC<{ w?: number }> = ({ w = 220 }) => (
  <g>
    <rect x={-w / 2} y={-w * 0.24} width={w} height={w * 0.48} rx={10} fill={T.A[1]} {...S} />
    <circle r={w * 0.15} fill={T.BL} fillOpacity={0.5} stroke={T.K} strokeWidth={4} />
    <text y={w * 0.07} textAnchor="middle" fontFamily={F.cifra} fontSize={w * 0.2} fill={T.K}>$</text>
  </g>
);

export const Calendario: React.FC<{ w?: number; n?: string; titulo?: string; hoja?: number }> = ({ w = 300, n = "", titulo = "MES", hoja = 0 }) => {
  const h = w * 1.05;
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={18} fill={T.BL} {...S} />
      <path d={`M${-w / 2} ${-h / 2 + 18} a18 18 0 0 1 18 -18 h${w - 36} a18 18 0 0 1 18 18 v${h * 0.22 - 18} h${-w} z`} fill={T.P} {...S} />
      <text y={-h / 2 + h * 0.16} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={w * 0.1} fill={T.BL}>{titulo}</text>
      {[-1, 1].map((x) => <rect key={x} x={x * w * 0.25 - 8} y={-h / 2 - 22} width={16} height={44} rx={8} fill={T.K} />)}
      <text y={h * 0.2} textAnchor="middle" fontFamily={F.cifra} fontSize={w * 0.34} fill={T.K}>{n}</text>
      {hoja > 0 && hoja < 1 && (
        <path d={`M${-w / 2} ${-h / 2 + h * 0.22} h${w} v${(h * 0.78) * (1 - hoja)} h${-w} z`} fill={T.BL} stroke={T.K} strokeWidth={4} opacity={0.95} />
      )}
    </g>
  );
};

const PELOS = [
  "M-46 -10 q0 -52 46 -52 q46 0 46 52 q-10 -26 -46 -28 q-36 2 -46 28z",
  "M-48 0 q-4 -62 48 -62 q52 0 48 62 l-10 -20 q-38 -22 -76 0z",
  "M-44 -14 q8 -46 44 -46 q40 0 44 40 q-20 -18 -88 6z",
  "M-50 10 q-6 -72 50 -72 q56 0 50 72 q-6 -30 -14 -36 q-36 14 -72 0 q-8 6 -14 36z",
];
export const Carita: React.FC<{ i?: number; r?: number; ropa?: string }> = ({ i = 0, r = 50, ropa }) => {
  const s = r / 50;
  return (
    <g transform={`scale(${s})`}>
      {ropa && <path d="M-60 95 q0 -55 60 -55 q60 0 60 55 z" fill={ropa} {...S} />}
      <circle r={50} fill={T.PIEL[i % T.PIEL.length]} {...S} />
      <path d={PELOS[i % PELOS.length]} fill={T.K} />
      <circle cx={-16} cy={6} r={5} fill={T.K} /><circle cx={16} cy={6} r={5} fill={T.K} />
      <path d="M-14 24 q14 12 28 0" fill="none" stroke={T.K} strokeWidth={4} strokeLinecap="round" />
    </g>
  );
};

/** Sello que cae de golpe. `t` = frames desde que empieza a caer. */
export const Sello: React.FC<{ texto: string; t: number; w?: number; color?: string; rot?: number }> = ({ texto, t, w = 520, color = T.P, rot = -9 }) => {
  if (t < 0) return null;
  const k = Math.min(1, t / 6);
  const sc = 2.4 - 1.4 * (k * k);
  const h = w * 0.34;
  const fs = Math.min(h * 0.55, (w - 80) / (texto.length * 0.72));
  return (
    <g transform={`rotate(${rot}) scale(${sc})`} opacity={Math.min(1, t / 3)}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={14} fill="none" stroke={color} strokeWidth={13} />
      <rect x={-w / 2 + 18} y={-h / 2 + 18} width={w - 36} height={h - 36} rx={8} fill="none" stroke={color} strokeWidth={5} />
      <text y={fs * 0.36} textAnchor="middle" fontFamily={F.cifra} fontSize={fs} fill={color} letterSpacing={2}>{texto}</text>
    </g>
  );
};

/** Hilo del que cuelga algo, desde fuera de la pantalla hasta (0, 0) local. */
export const Hilo: React.FC<{ largo: number }> = ({ largo }) => (
  <g><path d={`M0 ${-largo} V0`} stroke={T.K} strokeWidth={4} /><circle r={9} fill={T.BL} stroke={T.K} strokeWidth={4} /></g>
);

/** Etiqueta tipo gafete/píldora con texto mono. */
export const Etiqueta: React.FC<{ texto: string; color?: string; tinta?: string; size?: number }> = ({ texto, color = T.K, tinta = T.BL, size = 30 }) => {
  const w = texto.length * size * 0.66 + size * 1.4, h = size * 1.7;
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={color} stroke={T.K} strokeWidth={4} />
      <text y={size * 0.36} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={size} fill={tinta}>{texto}</text>
    </g>
  );
};

export const Check: React.FC<{ r?: number; color?: string }> = ({ r = 26, color = T.P }) => (
  <g><circle r={r} fill={color} stroke={T.K} strokeWidth={4} /><path d={`M${-r * 0.42} 0 l${r * 0.3} ${r * 0.3} l${r * 0.55} ${-r * 0.55}`} fill="none" stroke={T.BL} strokeWidth={r * 0.2} strokeLinecap="round" strokeLinejoin="round" /></g>
);
