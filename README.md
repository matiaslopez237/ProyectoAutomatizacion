# Proyecto Automatización

Trabajos de Tecnología de la Automatización (UTN FRSR) con PLC Siemens LOGO!.

**Simulador online:** https://matiaslopez237.github.io/ProyectoAutomatizacion/

## Contenido

| Carpeta | Qué hay |
|---|---|
| `simulador-logo/` | Simulador web: editor KOP tipo LOGO!Soft, sliders del entorno y dibujo del proceso (escenario actual: invernadero). |
| `Ejercicios/` | Programas `.lld` de LOGO!Soft Comfort: los propios, `Nuevos/` (ejercicios extra) y `Guia TP/` (un archivo por ejercicio de la guía). |
| `generador-lld/` | Scripts que arman los `.lld` por código usando las clases de LOGO!Soft Comfort V7. |

## Simulador

Necesita Node 20 o más nuevo.

```bash
cd simulador-logo
npm install
npm run dev      # http://localhost:5173
npm test         # tests del motor del PLC
npm run build    # genera dist/index.html (un solo archivo)
```

Cada push a `main` compila y publica el sitio con GitHub Actions (`.github/workflows/pages.yml`).

### Cómo está armado

- `src/plc/`: motor del PLC, independiente de la interfaz. Hace el ciclo de scan, implementa los bloques (contactos, bobinas, TON, TOF, contador, RS, analógicos) y valida el programa.
- `src/editor/`: editor KOP (lienzo, paleta, propiedades, Info Window).
- `src/scenarios/`: cada escenario es una carpeta con su física, su dibujo, sus sliders y un circuito de ejemplo. Para agregar uno, se copia `invernadero/` y se registra en `scenarios/index.ts`.
- `src/sim/runtime.ts`: el bucle que une el PLC con el proceso. El proceso corre siempre y el PLC solo en RUN.

Convención de entradas: cada entrada vale 1 cuando el dispositivo actúa. Por eso las paradas y los térmicos (NC) se dibujan como contacto cerrado, igual que en los ejercicios de LOGO!Soft.

## Generador de `.lld`

Ver [generador-lld/README.md](generador-lld/README.md).
