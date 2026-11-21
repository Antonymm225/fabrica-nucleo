import React from "react";
import { F, T } from "./lib";
import { S } from "./objetos";

/** Personajes y objetos nuevos (misma ilustración plana: contorno grueso y sombra dura).
 *  Persona y Torre se dibujan con (0,0) en la base (los pies / la moneda de abajo). El resto, centrado. */

export type Cara = "feliz" | "preocupado" | "sorprendido" | "neutro" | "enojado";
export type Gorro = "gorra" | "casco" | "sombrero" | "nada" | "pelo";
const ROPAS = () => [T.A[2], T.P, T.A[1], T.A[3], "#4A4450", T.A[0]];

export const Persona: React.FC<{ h?: number; piel?: number; ropa?: number | string; gorro?: Gorro; cara?: Cara; f?: number; nino?: boolean }> = ({ h = 520, piel = 1, ropa = 0, gorro = "gorra", cara = "neutro", f = 0, nino = false }) => {
  const s = h / 520;
  const sk = T.PIEL[piel % T.PIEL.length];
  const rc = typeof ropa === "string" ? ropa : ROPAS()[ropa % ROPAS().length];
  const parp = f % 96 > 92 ? 0.15 : 1;
  const ojo = cara === "sorprendido" ? 13 : 10;
  const boca: Record<Cara, React.ReactNode> = {
    feliz: <path d="M-36 -306 Q0 -268 36 -306" fill="none" stroke={T.K} strokeWidth={7} strokeLinecap="round" />,
    preocupado: <path d="M-30 -288 Q0 -310 30 -288" fill="none" stroke={T.K} strokeWidth={7} strokeLinecap="round" />,
    sorprendido: <ellipse cx={0} cy={-294} rx={15} ry={20} fill={T.K} />,
    neutro: <path d="M-26 -296 H26" stroke={T.K} strokeWidth={7} strokeLinecap="round" />,
    enojado: <path d="M-30 -286 Q0 -302 30 -286" fill="none" stroke={T.K} strokeWidth={7} strokeLinecap="round" />,
  };
  const cejas: Record<Cara, string> = {
    feliz: "M-56 -386 Q-36 -398 -16 -388 M16 -388 Q36 -398 56 -386",
    preocupado: "M-56 -378 L-16 -392 M16 -392 L56 -378",
    sorprendido: "M-56 -396 Q-36 -410 -16 -398 M16 -398 Q36 -410 56 -396",
    neutro: "M-54 -384 H-18 M18 -384 H54",
    enojado: "M-56 -394 L-16 -380 M16 -380 L56 -394",
  };
  return (
    <g transform={`scale(${s * (nino ? 0.7 : 1)})`}>
      {/* cuerpo */}
      <path d="M-150 0 C-150 -150 -120 -228 0 -232 C120 -228 150 -150 150 0 Z" fill={rc} {...S} />
      <path d="M-40 -228 L0 -180 L40 -228" fill="none" stroke={T.K} strokeWidth={5} strokeLinejoin="round" />
      <rect x={-28} y={-262} width={56} height={40} fill={sk} {...S} />
      {/* cabeza */}
      <circle cx={-96} cy={-338} r={18} fill={sk} {...S} />
      <circle cx={96} cy={-338} r={18} fill={sk} {...S} />
      <circle cx={0} cy={-345} r={96} fill={sk} {...S} />
      {gorro === "pelo" || gorro === "nada" ? <path d="M-96 -352 C-100 -452 100 -452 96 -352 C70 -400 -50 -408 -96 -352 Z" fill={T.K} /> : null}
      {gorro === "pelo" && <path d="M-96 -352 C-118 -300 -112 -250 -86 -232 L-80 -330 Z M96 -352 C118 -300 112 -250 86 -232 L80 -330 Z" fill={T.K} />}
      {gorro === "gorra" && (
        <g>
          <path d="M-100 -372 C-100 -470 100 -470 100 -372 Z" fill={T.P} {...S} />
          <path d="M-100 -374 Q-170 -380 -176 -360 Q-130 -350 -96 -360 Z" fill={T.P} {...S} />
        </g>
      )}
      {gorro === "casco" && (
        <g>
          <path d="M-108 -372 C-108 -486 108 -486 108 -372 Z" fill={T.A[0]} {...S} />
          <rect x={-132} y={-386} width={264} height={24} rx={12} fill={T.A[0]} {...S} />
          <path d="M0 -476 V-392" stroke={T.K} strokeWidth={6} />
        </g>
      )}
      {gorro === "sombrero" && (
        <g>
          <ellipse cx={0} cy={-392} rx={176} ry={30} fill="#C9A25E" {...S} />
          <path d="M-84 -396 C-84 -480 84 -480 84 -396 Z" fill="#C9A25E" {...S} />
          <path d="M-84 -412 H84" stroke={T.K} strokeWidth={10} />
        </g>
      )}
      {/* cara */}
      <path d={cejas[cara]} fill="none" stroke={T.K} strokeWidth={7} strokeLinecap="round" />
      <ellipse cx={-34} cy={-348} rx={ojo} ry={ojo * parp} fill={T.K} />
      <ellipse cx={34} cy={-348} rx={ojo} ry={ojo * parp} fill={T.K} />
      {cara === "feliz" && <><circle cx={-58} cy={-312} r={13} fill={T.P} opacity={0.35} /><circle cx={58} cy={-312} r={13} fill={T.P} opacity={0.35} /></>}
      {cara === "preocupado" && <path d="M70 -392 q8 16 0 24 q-8 -8 0 -24 z" fill="#7FB8E6" stroke={T.K} strokeWidth={3} />}
      {boca[cara]}
    </g>
  );
};

/** Familia: dos adultos y un niño. */
export const Familia: React.FC<{ w?: number; f?: number }> = ({ w = 420, f = 0 }) => {
  const h = w * 0.9;
  return (
    <g transform={`translate(0 ${h * 0.5})`}>
      <g transform={`translate(${-w * 0.28} 0)`}><Persona h={h} piel={2} ropa={0} gorro="gorra" cara="feliz" f={f} /></g>
      <g transform={`translate(${w * 0.28} 0)`}><Persona h={h * 0.95} piel={0} ropa={1} gorro="pelo" cara="feliz" f={f + 30} /></g>
      <g transform="translate(0 0)"><Persona h={h} piel={1} ropa={3} gorro="nada" cara="feliz" f={f + 60} nino /></g>
    </g>
  );
};

/** Torre de monedas con `n` monedas (la base en 0,0). */
export const Torre: React.FC<{ n: number; w?: number; color?: string }> = ({ n, w = 170, color }) => {
  const c = color ?? T.A[0], ry = w * 0.12, paso = w * 0.13;
  return (
    <g>
      {Array.from({ length: Math.max(0, Math.round(n)) }, (_, i) => {
        const y = -i * paso;
        return (
          <g key={i} transform={`translate(${(i % 3 === 1 ? 4 : i % 3 === 2 ? -3 : 0)} ${y})`}>
            <path d={`M${-w / 2} 0 v${-paso} a${w / 2} ${ry} 0 0 0 ${w} 0 v${paso} a${w / 2} ${ry} 0 0 1 ${-w} 0 z`} fill={c} stroke={T.K} strokeWidth={4} />
            <ellipse cx={0} cy={-paso} rx={w / 2} ry={ry} fill={c} stroke={T.K} strokeWidth={4} />
            <ellipse cx={0} cy={-paso} rx={w * 0.32} ry={ry * 0.6} fill="none" stroke={T.K} strokeWidth={2} opacity={0.35} />
          </g>
        );
      })}
    </g>
  );
};

export const Cartera: React.FC<{ w?: number }> = ({ w = 320 }) => {
  const h = w * 0.68;
  return (
    <g>
      <rect x={-w * 0.36} y={-h / 2 - 30} width={w * 0.62} height={h * 0.45} rx={8} fill={T.A[1]} {...S} transform="rotate(-8)" />
      <text x={-w * 0.06} y={-h / 2 + 20} textAnchor="middle" fontFamily={F.cifra} fontSize={w * 0.14} fill={T.BL} transform="rotate(-8)">$</text>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={26} fill="#8A5A3C" {...S} />
      <path d={`M${-w / 2} ${-h * 0.1} H${w / 2}`} stroke={T.K} strokeWidth={4} opacity={0.4} />
      <rect x={w * 0.12} y={-h * 0.16} width={w * 0.38} height={h * 0.32} rx={14} fill="#6E4630" {...S} />
      <circle cx={w * 0.3} cy={0} r={w * 0.035} fill={T.A[0]} stroke={T.K} strokeWidth={3} />
    </g>
  );
};

export const Tienda: React.FC<{ w?: number; texto?: string }> = ({ w = 380, texto = "TIENDA" }) => {
  const h = w * 0.82;
  return (
    <g>
      <rect x={-w / 2} y={-h / 2 + h * 0.22} width={w} height={h * 0.78} fill={T.BL} {...S} />
      {Array.from({ length: 6 }, (_, i) => (
        <path key={i} d={`M${-w / 2 + (i * w) / 6} ${-h / 2 + h * 0.08} h${w / 6} v${h * 0.18} a${w / 12} ${w / 14} 0 0 1 ${-w / 6} 0 z`} fill={i % 2 ? T.BL : T.P} stroke={T.K} strokeWidth={5} />
      ))}
      <rect x={-w * 0.42} y={-h / 2 - h * 0.06} width={w * 0.84} height={h * 0.15} rx={10} fill={T.K} />
      <text y={-h / 2 + h * 0.05} textAnchor="middle" fontFamily={F.cifra} fontSize={w * 0.09} fill={T.A[0]} letterSpacing={4}>{texto}</text>
      <rect x={-w * 0.12} y={h * 0.08} width={w * 0.24} height={h * 0.42} fill={T.A[2]} {...S} />
      <rect x={-w * 0.42} y={h * 0.02} width={w * 0.22} height={h * 0.2} fill="#BFE0F2" {...S} />
      <rect x={w * 0.2} y={h * 0.02} width={w * 0.22} height={h * 0.2} fill="#BFE0F2" {...S} />
    </g>
  );
};

export const Hospital: React.FC<{ w?: number }> = ({ w = 360 }) => {
  const h = w * 0.85;
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={10} fill={T.BL} {...S} />
      <rect x={-w * 0.1} y={-h * 0.42} width={w * 0.2} height={w * 0.5} fill="#D9473A" stroke={T.K} strokeWidth={4} />
      <rect x={-w * 0.25} y={-h * 0.42 + w * 0.15} width={w * 0.5} height={w * 0.2} fill="#D9473A" stroke={T.K} strokeWidth={4} />
      {[-1, 1].map((sx) => [0, 1].map((r) => <rect key={`${sx}${r}`} x={sx * w * 0.3 - w * 0.08} y={h * 0.05 + r * h * 0.2} width={w * 0.16} height={h * 0.13} fill="#BFE0F2" stroke={T.K} strokeWidth={4} />))}
      <rect x={-w * 0.11} y={h * 0.18} width={w * 0.22} height={h * 0.32} fill={T.A[2]} {...S} />
    </g>
  );
};

/** Globo de diálogo (o de pensamiento) con texto en varias líneas, centrado en (0,0). */
export const wrap = (t: string, max: number) => {
  const out: string[] = []; let cur = "";
  for (const w of t.split(/\s+/)) { if ((cur + " " + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }
  if (cur) out.push(cur);
  return out;
};
export const Globo: React.FC<{ texto: string; k?: number; piensa?: boolean; w?: number; cola?: number }> = ({ texto, k = 1, piensa = false, w = 760, cola = -1 }) => {
  const lineas = wrap(texto, 22), fs = 58, h = lineas.length * fs * 1.2 + 80;
  const chars = Math.round(texto.length * k);
  let usados = 0;
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={piensa ? h / 2 : 36} fill={T.BL} {...S} />
      {piensa
        ? <><circle cx={cola * 140} cy={h / 2 + 40} r={22} fill={T.BL} {...S} /><circle cx={cola * 175} cy={h / 2 + 90} r={13} fill={T.BL} {...S} /></>
        : <path d={`M${cola * 120 - 40} ${h / 2 - 3} L${cola * 170} ${h / 2 + 70} L${cola * 120 + 30} ${h / 2 - 3}`} fill={T.BL} {...S} />}
      {!piensa && <rect x={cola * 120 - 37} y={h / 2 - 12} width={64} height={14} fill={T.BL} />}
      {lineas.map((l, i) => {
        const vis = Math.max(0, Math.min(l.length, chars - usados)); usados += l.length + 1;
        return <text key={i} y={-h / 2 + 40 + fs * 0.95 + i * fs * 1.2} textAnchor="middle" fontFamily={F.texto} fontWeight={800} fontSize={fs} fill={T.K}>{l.slice(0, vis)}</text>;
      })}
    </g>
  );
};
