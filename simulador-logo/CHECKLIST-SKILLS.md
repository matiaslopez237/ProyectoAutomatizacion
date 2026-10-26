# Kit web — orden de uso por proyecto

Escribí cada comando en el chat de Claude Code (abierto en la carpeta del cliente).
Lo que va después del comando es la indicación: cuanto más concreta, mejor.

## 1. Arranque con el cliente
- [ ] `/grill-me quiero hacer <tipo de sitio> para <cliente>` — te pregunta hasta que no quede nada por definir
- [ ] `/impeccable init` — guarda público, objetivo y tono en `PRODUCT.md`

## 2. Diseño
- [ ] Sitio nuevo: `/design-taste-frontend armá la landing` o `/impeccable craft <sección>`
- [ ] Sitio que ya existe: `/redesign-existing-projects`
- [ ] Mostrarle opciones al cliente: `/prototype 3 versiones del hero`
- [ ] Ajustes puntuales: `/impeccable typeset` · `layout` · `colorize` · `bolder` · `quieter`
- [ ] Animaciones: `/emil-design-eng revisá y mejorá las animaciones`
- [ ] Celular: `/mobile-native`
- [ ] Antes de agregar un componente (slider, modal, toast…): `/pick-ui-library`

## 3. Construcción
- [ ] `/design-system` — colores, tipografías y espaciados consistentes
- [ ] `/frontend-a11y` — teclado, lectores de pantalla, contraste
- [ ] Solo React/Next: `/react-performance` · `/nextjs-turbopack`
- [ ] Algo carga lento: `/performance-optimization` (arregla lo que encontró `/webperf`)
- [ ] Si algo falla: `/investigate <qué pasa>` (gstack)

## 4. Antes de entregar
- [ ] `/impeccable audit` — accesibilidad, rendimiento, responsive
- [ ] `/webperf` — velocidad de carga y Core Web Vitals (para medir de verdad: `npx lighthouse <url> --output json --output-path ./lighthouse.json` y pasale el archivo)
- [ ] `/seo` — metadatos, sitemap, datos estructurados
- [ ] `/security-review` — formularios, APIs, claves
- [ ] `/cso` — auditoría de seguridad completa (gstack)
- [ ] `/impeccable polish` — repaso final
- [ ] `/qa <url>` — prueba en navegador real (gstack)
- [ ] `/benchmark <url>` — velocidad de carga (gstack)
- [ ] `/design-review` — revisión visual final (gstack; necesita git sin cambios pendientes)

## Notas
- Las skills de gstack (`/cso`, `/qa`, `/investigate`, `/design-review`, `/benchmark`) están instaladas globales, no vienen en el kit.
- `/impeccable` baja su motor una sola vez la primera vez que lo usás (a `~/.impeccable/bin`).
