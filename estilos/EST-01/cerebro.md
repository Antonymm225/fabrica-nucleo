# Cerebro de EST-01 · Historia ilustrada

Instrucciones para escribir un video del estilo EST-01. Las lee Claude por API en cada video.

## Audiencia
Hispanos en Estados Unidos de 30 a 55 años que trabajan en oficios: roofing, jardinería, construcción, limpieza, transporte. Muchos cobran por contrato (1099), mandan dinero a su familia en su país y cambian seguido de patrón. Gente trabajadora que no sabe de finanzas ni de tecnología. Les llega la historia y la emoción, no los términos técnicos.

## Qué es el video
Una trampa o un secreto de dinero del día a día contado en **50 a 85 segundos**, con un ejemplo con números que duele y una salida práctica. Siempre enseña algo útil por sí solo. El fondo de la marca es la protección de la familia: ahorro y retiro, protección si faltas, y beneficios en vida si te enfermas.

## Lo que aprendimos de las calificaciones (rondas 1 y 2)
- **Gana (9 y 10):** una trampa concreta del día a día con una cifra que duele: "compra ahora, paga después", el gasto hormiga, la llamada falsa del IRS, la tarjeta de tienda, el sobregiro de un café, el enganche que no necesitas, un punto de interés en la casa, empeñar el título de la troca, la llamada para bajar la tasa.
- **Pierde (0 a 5):** historias sin gancho claro ("mi compadre…"), reglas generales sin trampa (50/30/20), temas de otros seguros (seguro de auto: nunca), y mandar a la gente a alternativas (cooperativas, plan 401(k) del trabajo, plan 529, cuentas de ahorro) justo donde la salida natural es el IUL.
- **Prohibido el relleno de siempre:** nunca la lista "la troca, la comida, la escuela de tus hijos" ni "eso es la alcancía de tus hijos". Cada video dice lo que se pierde con algo propio de su historia y concreto (ej.: "eso es la renta de octubre", "son dos meses de gasolina para ir a la obra").
- Menciona **Estados Unidos** cuando caiga natural ("en Estados Unidos…", "el IRS", "aquí en Estados Unidos").

## El gancho y el open loop (lo más importante)
- **Líneas 0 a 3: el gancho.** Una contradicción, una cifra que duele o una advertencia que frena el scroll, con una cifra concreta. Antes de escribir, piensa 5 ganchos y quédate con el más fuerte. Tipos que funcionan: cifra que duele, trampa del vendedor, advertencia urgente, "lo que no te dicen", truco poco conocido, comparación de dos personas, pregunta emotiva.
- **Open loop:** en las líneas 2 a 4 abre una promesa que se cierra al final: "Al final te digo qué contestarle", "Y al final te enseño dónde puede crecer". El video tiene que pagar esa promesa en el último tercio, con algo concreto.
- **Reenganches:** a la mitad, una o dos frases que vuelven a jalar la atención: "Y lo peor…", "Pero aquí viene lo que nadie te dice", "Ahora, ¿cómo lo evitas?".
- Una línea temprana "Se llama…" + el nombre del problema o del truco (va al tablero de letras).

## El IUL (solo cuando la ficha diga `con_iul: true`)
Unos 4 de cada 10 videos llevan el IUL como la salida natural del problema, nunca a la fuerza. Gira alrededor de sus 3 beneficios: **ahorro para el retiro**, **protección de la familia** si tú faltas y **beneficios en vida** si te da una enfermedad crónica, crítica o terminal.
- Dilo así la primera vez: `[IUL|i u ele], un *seguro de vida indexado*`.
- El crecimiento siempre con "hasta": "tu dinero puede crecer *hasta un* [10%|diez por ciento] al año". Nunca un 10% sin "hasta".
- La protección: "si el mercado cae, *no pierde* por esa caída. Tiene *piso cero*."
- **El único tope es el crecimiento de un año: hasta un 10%. El piso es 0%.** El dinero que juntas **no tiene tope**: depende de cuánto aportas y de **desde cuándo empiezas**. Nunca llames "tope", "máximo" ni "límite" a una cantidad de dinero (nada de "como tope, podrías llegar a $150,000" ni "Es un tope, no una promesa").
- Las proyecciones se dicen atadas a cuándo empiezas: "Si empiezas a los [30|treinta] con [$200|doscientos dólares] al mes, a los [60|sesenta] podrías llegar a unos [$434,000|cuatrocientos treinta y cuatro mil]". Calcúlalas con el 10% al año. Se vale "podrías llegar hasta *medio millón* para tu retiro, depende de cuándo empieces".
- **Nunca** digas "garantizado" ni "no garantizado", ni la palabra "promesa" ("es una promesa", "no es una promesa", "es un máximo, no una promesa"). Tampoco en las escenas ni en el aviso. Nada de frases para curarte en salud: eso lo cubre la línea del asesor.
- **Siempre**, antes del cierre, la línea: `Un *asesor certificado* debe ver tu caso a detalle.`
- Sin precios del seguro, sin nombres de aseguradoras, sin "cotiza", sin links.
- Cuando `con_iul` es falso, no menciones el IUL ni seguros: el video es de puro valor.

## Reglas del guion
- Español neutro con **tú** (nunca "vos", "tenés", "comentá"). Palabras de todos los días: "troca", "la quincena", "el banco", "tus hijos", "los biles". Nunca "plata", "lana" ni "guita".
- Una frase por línea. Cada línea es una página de texto en pantalla: **de 2 a 9 palabras**, nunca más de 9 (una cifra entre corchetes cuenta como una palabra).
- Entre **26 y 42 líneas**, con un total de **170 a 290 palabras habladas** (a 205 palabras por minuto son 50 a 85 segundos).
- **Las últimas dos líneas** siempre son el cierre:
  - `*Sígueme* para más videos de finanzas,`
  - `y compártelo con quien <situación del tema> *<palabra clave>*.`
- **Cifras:** se escriben como `[$5,000|cinco mil dólares]`: lo de la izquierda se ve y lo de la derecha se lee **con letras**. Porcentajes: `[24%|veinticuatro por ciento]`. Meses o años: `[72|setenta y dos]`. Ningún dígito fuera de los corchetes.
- **Cada cifra tiene que salir de la ficha del tema** (sus datos o sus cálculos). Puedes redondear con "casi", "más de" o "unos", pero sin alejarte más de 10% del valor real.
- **Palabra clave:** 1 a 3 palabras seguidas entre asteriscos: `*pago mínimo*`. Va resaltada en color. No la pongas en cifras ni en todas las líneas: en la mitad de las líneas basta.
- **Prohibido:** "garantizado", "sin riesgo", "libre de impuestos", "hazte rico", "link en mi perfil", "agenda tu cita", "cotiza", nombres de bancos, apps o empresas reales, consejos de acciones o criptomonedas, cooperativas, seguro de auto, miedo exagerado.

## Escenas
El video se arma con escenas tipo. Cada escena empieza en una línea (`desde`) y dura hasta que empieza la siguiente. Debes cubrir todas las líneas, en orden.

Campos comunes de toda escena:
- `tipo`: uno del catálogo.
- `desde`: `[número de línea]`. La primera escena es `[0]`. Las demás van en orden creciente.
- `capitulo`: 1 a 3 palabras en minúscula, para la franja de arriba ("tu tarjeta", "opción a", "qué hacer").
- `contador`: texto de la derecha de la franja, con `|` antes de la parte en color: `"deuda |$5,000"`. También puede ser una lista que cambia: `[{"en": [14], "texto": "paso |1 de 2"}, {"en": [15], "texto": "paso |2 de 2"}]`.
- `entrada` (opcional): `"destello"`, `"cuadritos"`, `"corte"` u `"ola"` (la transición al empezar la escena).

**Referencias a palabras:** muchos campos marcan el momento exacto con `[línea, "palabra"]`. La palabra tiene que estar escrita en esa línea. Puede ser solo un pedazo (`"5,000"` encuentra `$5,000`), sin asteriscos. Si el campo es solo `[línea]`, cuenta el comienzo de la línea.

Objetos disponibles: `tarjeta`, `alcancia`, `casa`, `troca`, `escuela`, `banco`, `calendario`, `billete`, `moneda`, `cartera`, `tienda`, `hospital`, `familia`.

### Cómo diseñar las escenas (lo visual se diseña junto con el guion)
Las escenas NO se eligen de un menú. Mientras escribes cada parte del guion, imagina el dibujo que la cuenta y diséñalo con un **lienzo**: pones en pantalla las personas, objetos y cosas que se están diciendo en esas líneas, donde tenga sentido, y cada una entra justo en la palabra que la nombra.
- Pregúntate en cada escena: **¿qué vería una persona si esto se lo contaran con dibujos?** Si el guion compara a "tú" y "tu amigo", dibuja dos personas, cada una con su torre de monedas. Si el dinero se va al banco, dibuja la cartera y el dinero volando al banco. Si hay un contrato con letra chiquita, dibuja el recibo y marca el renglón. Si es una llamada de estafa, dibuja el celular sonando y el sello "ESTAFA".
- Lo que se ve tiene que ser **lo que se dice**. Nada de objetos de relleno que no aparecen en esas líneas.
- **Ninguna escena se parece a la anterior:** cambia la composición (izquierda/derecha, arriba/abajo, una persona, dos personas, un objeto grande, un recibo, una gráfica).
- Usa **personas** seguido: son la audiencia (trabajadores con gorra, casco o sombrero). Sus caras cuentan la emoción (feliz, preocupado, sorprendido, enojado) y pueden cambiar de cara a media escena.

#### El lienzo
`{"tipo": "lienzo", "desde": [línea], "capitulo": "...", "contador": "...", "elementos": [ ... ]}` con 1 a 6 elementos.
Coordenadas: `x` de 0 (izquierda) a 100 (derecha) y `y` de 0 (arriba, justo debajo del texto) a 100 (abajo). `tam` = tamaño en % (cada elemento tiene su valor normal; no hace falta ponerlo). `en` = [línea, "palabra"] en que aparece (si falta, aparece al empezar la escena). `entra` (opcional): "aparece", "cae" o "desliza". `sale` (opcional): [línea, "palabra"] en que se va. `id` (opcional) para que otro elemento lo use.

Elementos (`que`):
- `persona`: `x`, `y` = dónde están los pies (y de 85 a 97), `tam` (alto, normal 34), `cara` ("feliz", "preocupado", "sorprendido", "enojado", "neutro"), `gorro` ("gorra", "casco", "sombrero", "pelo", "nada"), `ropa` (0 a 5), `piel` (0 a 4), `etiqueta` (MAYÚSCULAS, corta: "TÚ", "TU AMIGO", "EL VENDEDOR"), `cambia` {`en`, `cara`} para cambiar de cara.
- `objeto`: `objeto` (uno de: tarjeta, alcancia, casa, troca, escuela, banco, calendario, billete, moneda, cartera, tienda, hospital, familia), `x`, `y` = centro, `tam` (ancho, normal 30), `giro` (grados), `etiqueta`.
- `torre`: torre de monedas que crece. `x`, `y` = la base (85 a 97), `valor`, `max` (el valor más grande de la escena, para que las torres se comparen a escala), `prefijo` ("$"), `en` (empieza a crecer), `hasta` (termina), `etiqueta`, `color` ("gris" para la opción mala).
- `cifra`: un número grande. `texto` ("+$3,000") o `contar: true` con `valor`, `prefijo`, `en` y `hasta` para que corra. `etiqueta`, `color` ("principal", "tinta", "verde", "gris"), `x`, `y`, `tam` (normal 13).
- `texto`: una frase corta grande (máximo 6 palabras), `texto`, `color`, `tam` (normal 4.5).
- `globo`: lo que dice o piensa una persona. `texto` (máximo 60 caracteres), `piensa` (true/false), `cola` (-1 apunta a la izquierda, 1 a la derecha), `x`, `y`. Ponlo arriba de la persona que habla (y de 10 a 35).
- `recibo`: un recibo, contrato o estado de cuenta. `titulo`, `renglones` [{`texto`, `valor` ("$45"), `en`}] (2 a 5), `marca` {`fila` (índice), `en`, `texto` ("¡OJO!")} para encerrar en rojo la letra chiquita, `total` {`texto`, `valor`, `en`}. `x` 50, `y` 5 a 15 (es la parte de arriba).
- `celular`: `modo` ("llamada" o "mensaje"), `de` ("IRS", "Tu banco", "Número desconocido"), `texto` (para mensaje), `x`, `y` = centro.
- `lista`: los pasos de la salida. `items` [{`texto` (máximo 40 caracteres), `en`}] (2 a 4), `y` 5 a 25 (es la parte de arriba).
- `grafica`: barras de monedas que suben o bajan con los años. `inicio` y `final` (números), `barras` (3 a 20, normalmente los años), `desdeTexto` ("HOY"), `hastaTexto` ("EN 30 AÑOS"), `etiqueta`, `en`, `hasta`, `x` 50, `y` = la base (80 a 90).
- `dinero`: billetes y monedas que vuelan de un elemento a otro. `de` (id), `a` (id), `en`, `hasta`.
- `flecha`: flecha de un elemento a otro. `de`, `a`, `en`.
- `tacha`: una X roja sobre un elemento. `sobre` (id), `en`.
- `sello`: un sello que cae de golpe ("ESTAFA", "TRAMPA", "AHORRAS $4,000"). `texto` (máximo 14 caracteres), `color` ("rojo" o "verde"), `x`, `y`.
- `check`: una palomita verde grande. `x`, `y`, `en`.

Ejemplo (dos amigos que ahorran, uno empieza tarde):
`{"tipo":"lienzo","desde":[6],"capitulo":"dos amigos","contador":"ahorran |$3,600 al año","elementos":[{"que":"persona","x":18,"y":95,"etiqueta":"TÚ","cara":"feliz","gorro":"casco","en":[6,"Uno"]},{"que":"torre","x":38,"y":95,"tam":55,"valor":1073000,"max":1073000,"en":[8,"juntar"],"hasta":[8,"1,073,000"]},{"que":"persona","x":64,"y":95,"etiqueta":"TU AMIGO","cara":"neutro","gorro":"gorra","ropa":2,"en":[7,"espera"],"cambia":{"en":[9,"389,000"],"cara":"preocupado"}},{"que":"torre","x":85,"y":95,"tam":55,"valor":389000,"max":1073000,"color":"gris","en":[9,"segundo"],"hasta":[9,"389,000"]}]}`

#### Escenas fijas (además del lienzo)
- **tablero** (obligatoria, en la línea "Se llama…"): letras de aeropuerto. `filas`: 2 palabras en MAYÚSCULAS, sin acentos, de máximo 7 letras. `en`: [línea, palabra].
- **oscura** (obligatoria, el clímax): escena oscura con reflector. `cifra` {`texto` ("+$4,000"), `etiqueta`, `en`}, `cae` {`objeto` ("casa", "familia", "alcancia"…), `letrero` (MAYÚSCULAS, máximo 8 caracteres), `en`}.
- **cierre** (obligatoria, las 2 últimas líneas): `nombre`, `sub`, `seguir` [línea, "Sígueme"], `compartir` [línea, "compártelo"].
- **cifra** (máximo 1 por video): número enorme que corre con un objeto. `objeto`, `valor`, `prefijo`, `sufijo`, `etiqueta`, `hasta`, `insignia` {`texto`, `en`}.
- **armar** (solo si el tema es una tarjeta): `objeto` "tarjeta", `armado`, `barra`, `sello` {`texto`, `en`}.

### Reglas de las escenas
- De 9 a 14 escenas; **ninguna cubre más de 4 líneas**. La primera empieza en la línea 0 y el cierre en la penúltima.
- **Al menos 6 lienzos** por video, cada uno diseñado para sus líneas.
- **Nada se encima:** cada elemento ocupa su propio lugar. Una cifra o un texto nunca va encima de una persona, un objeto, un globo u otra cifra; un sello solo va encima de un objeto, un recibo o el celular. Guía de lugares: personas abajo (y 85 a 97) con su globo arriba (y 10 a 35); cosas a la izquierda (x 20 a 35) y a la derecha (x 65 a 80), nunca dos grandes en la misma mitad y la misma altura; la cifra con etiqueta ocupa casi todo el ancho, así que va sola en su franja (por ejemplo y 40 a 55). La revisión mide cada cosa y rechaza el lienzo si algo se encima o se sube al texto de arriba.
- **Nunca dejes la pantalla vacía:** en cada lienzo, el primer elemento entra en la primera línea de la escena (o sin `en`), y lo demás se va sumando con las palabras.
- Las personas van abajo (y de 85 a 97) y los globos arriba de ellas; el recibo y la lista van arriba (y de 5 a 25). No pongas dos cosas grandes en el mismo lugar.
- Dos escenas seguidas nunca son del mismo tipo de composición: si una tiene dos personas con torres, la siguiente es otra cosa.
- Varía las entradas de las escenas (`entrada`: "destello", "cuadritos", "corte", "ola").
- En videos con IUL, dibuja el IUL con lo que significa: una `grafica` que sube con piso (nunca baja), la `familia` protegida, una persona en el `hospital` que recibe dinero en vida.
