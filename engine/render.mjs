// node render.mjs <slug>                     -> render completo a videos/<slug>/render/<slug>.mp4
// node render.mjs <slug> --stills 1.5,40,90   -> fotogramas sueltos + hoja en videos/<slug>/stills/
// node render.mjs <slug> --hoja [cada_s]      -> un fotograma cada N s (por defecto 4) + hoja
// node render.mjs <slug> --tramo 90-100[,120-130] -> renderiza esos tramos y arma hojas a 5 cuadros/s (para ver el movimiento)
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "child_process";
import path from "path"; import fs from "fs"; import os from "os";
const slug = process.argv[2];
if (!slug) { console.error("uso: node render.mjs <slug> [--stills t1,t2 | --hoja N]"); process.exit(1); }
const ROOT = path.resolve(".."); const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const VD = path.join(ROOT, "videos", slug);
execFileSync(PY, ["-X", "utf8", path.join(ROOT, "tools", "usar.py"), slug], { stdio: "inherit" });
const tmp = path.join(ROOT, "tmp"); fs.mkdirSync(tmp, { recursive: true }); process.env.TEMP = tmp; process.env.TMP = tmp;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "VIDEO" });
const si = process.argv.indexOf("--stills"), hi = process.argv.indexOf("--hoja"), ti = process.argv.indexOf("--tramo");
if (ti > 0) {
  const dir = path.join(VD, "tramos"); fs.mkdirSync(dir, { recursive: true });
  for (const tr of process.argv[ti + 1].split(",")) {
    const [a, b] = tr.split("-").map(Number); const mp4 = path.join(dir, `t_${a}-${b}.mp4`);
    await renderMedia({ composition, serveUrl, codec: "h264", scale: 0.4, crf: 23, concurrency: Math.max(2, os.cpus().length - 2), frameRange: [Math.round(a * 30), Math.min(composition.durationInFrames - 1, Math.round(b * 30) - 1)], outputLocation: mp4 });
    const rows = Math.ceil((b - a) * 5 / 10);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", mp4, "-vf", `fps=5,scale=216:-1,tile=10x${rows}:padding=4:color=white`, "-frames:v", "1", path.join(dir, `t_${a}-${b}.jpg`)]);
    console.log("tramo:", path.join(dir, `t_${a}-${b}.jpg`), "(cada fila = 2 s, 5 cuadros/s)");
  }
} else if (si > 0 || hi > 0) {
  const dur = composition.durationInFrames / 30; const step = hi > 0 && process.argv[hi + 1] ? Number(process.argv[hi + 1]) : 4;
  const ts = si > 0 ? process.argv[si + 1].split(",").map(Number) : Array.from({ length: Math.floor(dur / step) }, (_, k) => +(1 + k * step).toFixed(1));
  const dir = path.join(VD, "stills"); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  for (const t of ts) await renderStill({ composition, serveUrl, frame: Math.round(t * 30), output: path.join(dir, `s_${t}.jpg`), imageFormat: "jpeg", jpegQuality: 75, scale: 0.5 });
  execFileSync(PY, ["-X", "utf8", path.join(ROOT, "tools", "hoja.py"), dir], { stdio: "inherit" });
} else {
  const out = path.join(VD, "render"); fs.mkdirSync(out, { recursive: true }); let last = 0; const t0 = Date.now();
  await renderMedia({ composition, serveUrl, codec: "h264", crf: 18, audioBitrate: "192k", concurrency: Math.max(2, os.cpus().length - 2), outputLocation: path.join(out, `${slug}.mp4`),
    onProgress: ({ progress }) => { if (progress - last >= 0.05) { last = progress; console.log(Math.round(progress * 100) + "% · " + Math.round((Date.now() - t0) / 1000) + " s"); } } });
  console.log("DONE", path.join(out, `${slug}.mp4`));
}
