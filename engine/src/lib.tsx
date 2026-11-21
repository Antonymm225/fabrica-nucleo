import React from "react";
import { Audio, Easing, Sequence, interpolate, spring, staticFile } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadBlack } from "@remotion/google-fonts/ArchivoBlack";
import MARCA from "./video/marca.json";

export const W = 1080, H = 1920, FPS = 30;
export const F = {
  texto: loadInter("normal", { weights: ["500", "600", "800"], subsets: ["latin", "latin-ext"] }).fontFamily,
  clave: loadSerif("italic", { subsets: ["latin", "latin-ext"] }).fontFamily,
  mono: loadMono("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext"] }).fontFamily,
  cifra: loadBlack("normal", { subsets: ["latin", "latin-ext"] }).fontFamily,
};

const c = MARCA.colores;
/** Colores de la marca. P = principal, K = tinta (contornos), B = fondo. */
export const T = { B: c.fondo, P: c.principal, K: c.tinta, G: c.gris, A: c.acentos, BL: "#FFFDF8", PIEL: ["#F2C9A5", "#D9A27A", "#B27A55", "#8A5A3C", "#F5D7BD"] };
export const marca = MARCA;

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const lin = (f: number, a: number, b: number, x = 0, y = 1, ease?: (t: number) => number) =>
  interpolate(f, [a, b], [x, y], { ...clamp, easing: ease });
export const eo = Easing.out(Easing.cubic);
export const eio = Easing.inOut(Easing.cubic);

/** Resorte 0→1 que arranca en `d`. Con rebote suave (como la referencia). */
export const sp = (f: number, d = 0, cfg: { damping?: number; stiffness?: number; mass?: number } = {}) =>
  spring({ frame: f - d, fps: FPS, config: { damping: 11, stiffness: 170, mass: 0.6, ...cfg } });
/** Balanceo amortiguado de algo que cuelga de un hilo (grados). */
export const swing = (f: number, d: number, amp = 9, per = 22) => {
  const t = f - d; if (t < 0) return 0;
  return amp * Math.exp(-t / 26) * Math.sin((t / per) * Math.PI * 2);
};
/** Número pseudoaleatorio estable. */
export const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

/** Efecto de sonido en el frame `at` (relativo a la escena). */
export const Sfx: React.FC<{ at: number; s: string; v?: number }> = ({ at, s, v = 0.5 }) =>
  at < 0 ? null : (
    <Sequence from={Math.round(at)} durationInFrames={90} layout="none">
      <Audio src={staticFile(`sfx/${s}.mp3`)} volume={v} />
    </Sequence>
  );

/** Filtro de sombra dura desplazada (sin desenfoque), como la referencia. */
export const Defs: React.FC = () => (
  <defs>
    <filter id="sombra" x="-20%" y="-20%" width="150%" height="150%">
      <feOffset in="SourceAlpha" dx={9} dy={10} result="o" />
      <feFlood floodColor={T.K} floodOpacity={1} />
      <feComposite in2="o" operator="in" result="s" />
      <feMerge><feMergeNode in="s" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="sombraSuave" x="-20%" y="-20%" width="150%" height="150%">
      <feOffset in="SourceAlpha" dx={6} dy={7} result="o" />
      <feFlood floodColor={T.K} floodOpacity={0.9} />
      <feComposite in2="o" operator="in" result="s" />
      <feMerge><feMergeNode in="s" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="grano" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={2} seed={3} result="n" />
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0.07 0" />
    </filter>
    <filter id="brillo" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation={18} result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>
);
