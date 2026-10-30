# Plan: rediseño del simulador por paneles

Rama: `rediseno-paneles`. Solo escritorio (no se adapta a celulares). GitHub Pages sigue publicando `main` hasta que se una la rama.

## 0. Rama
- [x] Crear `rediseno-paneles` desde `main` con el `.lsc` del invernadero y su generador.

## 1. Barra de arriba
- [x] Al lado de **Conexiones y E/S**: botones **Sliders**, **Ladder**, **Bloques** y **Sim. en vivo**. Cada uno abre o cierra su panel y queda resaltado si está abierto.
- [x] Ladder y Bloques comparten el centro: se ve uno a la vez (abrir uno cierra el otro).
- [x] Se mantienen RUN/STOP, velocidad y "Reiniciar proceso".
- [x] Se recuerda qué paneles quedaron abiertos (localStorage).

## 2. Barra de cada panel
- [x] Título a la izquierda y, a la derecha, **⤢ expandir** y **✕ cerrar** (Sliders solo tiene ✕).
- [x] Expandir maximiza el panel dentro de la ventana, tapando a los demás; se vuelve con el mismo botón o con Esc.
- [x] Si están todos cerrados, un mensaje invita a abrir alguno.

## 3. Sliders (izquierda)
- [x] Igual que ahora, con el ancho ajustable.

## 4. Ladder (centro)
- [x] Se sigue pudiendo editar el circuito.
- [x] Paleta de bloques e Info Window en un **menú plegable** (botón "☰ Bloques e info", arranca cerrado; si el programa tiene errores, el botón muestra cuántos).
- [x] Queda la barra de herramientas (deshacer, zoom, archivo).

## 5. Bloques / FUP (centro, solo ver y simular)
- [x] `generador-lld/exportar-fup.bsh` lee `Ejercicios/Proyecto/Invernadero.lsc` con las clases de LOGO!Soft y escribe `simulador-logo/src/scenarios/invernadero/fup.json` (bloques, posiciones, cables con quiebres, negaciones, parámetros, comentarios y nombres de E/S).
- [x] Vista con el estilo FUP de LOGO!Soft: grilla de puntos, bloques amarillos numerados, entradas negadas con circulito, parámetros en verde.
- [x] En simulación pinta cables y bloques según su estado y muestra T, Cnt y Ax en vivo. Decisión: el FUP tiene su propio motor (`src/plc/fup.ts`) y corre siempre a la par del KOP con las mismas entradas; el proceso lo maneja el programa que está en el centro (Ladder o Bloques).
- [x] Test (`fup.test.ts`): el FUP da las mismas salidas que el ladder durante un día simulado y en casos de lluvia, emergencia, riego manual, falla de riego y alarma.
- [x] Sin edición; zoom y desplazamiento.

## 6. Sim. en vivo (abajo a la derecha)
- [x] Ventana flotante del tamaño de la animación; se redimensiona desde la esquina superior izquierda manteniendo la proporción y puede superponerse. Se recuerda el tamaño.
- [x] Se quita el texto de resumen ("Riego por horario y por humedad…"); el tiempo simulado queda como un reloj sobre la animación.
- [x] Solo al expandirla aparece a la izquierda un **mini menú** plegable: entradas I1–I5, sliders del entorno (de ellos salen los sensores), valores de AI1–AI4 y luces de las salidas Q1–Q8.

## 7. Skin de LOGO!Soft Comfort
- [ ] Ventana gris claro, barra de íconos, franja azul oscuro "Editor de diagramas", pestaña con el nombre del archivo y línea naranja.
- [ ] Ladder: lienzo blanco con líneas por escalón y riel izquierdo negro grueso. FUP: grilla de puntos.
- [ ] Bloques amarillos, selección con cuadraditos rojos, barra de estado abajo ("LOGO! 8.4 · 100 %").

## 8. Verificación
- [ ] `npm test` (incluido FUP vs. ladder) y `npm run build`.
- [ ] Prueba en el navegador: abrir/cerrar, expandir, redimensionar la simulación, mini menú, menú plegable del ladder y vista Bloques corriendo.
