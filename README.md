# Fábrica de videos · núcleo

Videos verticales de finanzas para las marcas de Ecomfy Lead. Remotion + ElevenLabs. El render corre en GitHub Actions.

## Carpetas

```
config.json                voz (modelo, voice_id, palabras por minuto) y carpeta de salida local
estilos/EST-01/ficha.md     ficha del estilo (la referencia de video NO se sube: es de terceros)
marcas/<marca>.json         colores, tono, voz y cierre de cada marca
videos/<CÓDIGO>/            guion.txt y escenas.json (la voz y el MP4 los hace GitHub)
engine/                     motor Remotion: objetos, escenas, textos y transiciones de EST-01
tools/                      voz.py (ElevenLabs), usar.py, finalizar.py, hoja.py
.github/workflows/render.yml render en la nube
```

## Hacer un video

1. Escribir `videos/<CÓDIGO>/guion.txt` y `escenas.json`.
2. La voz la genera GitHub con ElevenLabs (Secret `ELEVENLABS_API_KEY`). No hace falta la PC.
3. Subir los cambios a `main`. GitHub renderiza ese video solo.
4. Descargar el MP4 desde la pestaña **Actions** → el run → **Artifacts**. Se borra en 1 día.

Render a mano: Actions → **Render de videos** → **Run workflow** → códigos separados por coma.

## Reglas

- Nunca subir llaves: van como Secrets del repo.
- Nunca subir videos de referencia de otros creadores.
- Las cifras de cada guion se verifican con Python y se anotan en el guion.
