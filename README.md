# ioxee.github.io

Portfolio de [Isidro Rosell](https://ioxee.github.io/), programador full-stack. Está hecho con [Astro](https://astro.build) y TypeScript, sin jQuery, y se publica como sitio estático en GitHub Pages.

El diseño es una carpeta de pruebas amarilla sobre una mesa: en la portada, una polaroid con clip y un sello con el nombre; dentro, el currículum en hojas de doble cara que se pasan con el scroll, como un parallax. Tiene tema de día y de noche.

## Empezar

Hace falta Node 22.19 o superior: los scripts (`assets:*`, `import:linkedin`, `fetch:linkedin`) y sus tests ejecutan TypeScript directamente, y Lighthouse pide esa versión.

```bash
npm install
npm run dev
```

El servidor de desarrollo queda en <http://localhost:4321>.

## Comandos

| Comando                   | Qué hace                                                                     |
| ------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`             | Servidor de desarrollo.                                                      |
| `npm run build`           | Compila el sitio en `dist/`.                                                 |
| `npm run preview`         | Sirve `dist/`. Es la forma de probar la CSP, que en `dev` no se aplica.      |
| `npm run check`           | Comprueba los tipos de TypeScript y de los `.astro`.                         |
| `npm test`                | Tests unitarios y de los datos.                                              |
| `npm run test:coverage`   | Lo mismo, exigiendo un 80 % de cobertura por archivo en `src/lib/`.          |
| `npm run test:dist`       | Tests sobre el HTML compilado (CSP, SEO, enlaces). Necesita `npm run build`. |
| `npm run test:e2e`        | Pruebas en navegador (Chromium y Firefox). Necesita `npm run build`.         |
| `npm run test:lighthouse` | Lighthouse en móvil y escritorio. Necesita `npm run build`.                  |
| `npm run test:visual`     | Compara capturas con las de referencia. Ver «Pruebas en navegador».          |
| `npm run format`          | Da formato con Prettier. `format:check` solo comprueba.                      |
| `npm run assets:brand`    | Regenera el favicon («IO») y el icono de Apple en `public/`.                 |
| `npm run assets:og`       | Regenera `public/og.jpg`, la imagen al compartir. Necesita `npm run build`.  |
| `npm run import:linkedin` | Pone al día `experience.yaml` con el export de LinkedIn. Ver más abajo.      |
| `npm run fetch:linkedin`  | Descarga de la API de LinkedIn una instantánea en JSON (necesita el token).  |

## Cambiar el contenido

Todo lo que se lee en la página sale de `src/data/*.yaml`. No hay que tocar componentes para actualizarlo. El build lo valida con un esquema ([`src/lib/schemas.ts`](src/lib/schemas.ts)) y falla con un mensaje claro si algo no cuadra.

| Archivo               | Contenido                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `profile.yaml`        | Nombre, titular, fecha de nacimiento, «Sobre mí», enlaces.                                     |
| `experience.yaml`     | Trabajo y formación. Las fechas son `'AAAA'` o `'AAAA-MM'`; `end: null` es «en curso».         |
| `skills.yaml`         | Habilidades: año de inicio y uso (`daily`, `comfortable`, `intermediate`, `basic`).            |
| `certifications.yaml` | Certificaciones y cursos que no son formación reglada: emisor, fechas, enlace de comprobación. |
| `projects.yaml`       | Proyectos, con `start` y `end` como en la experiencia: salen del más reciente al más antiguo.  |
| `languages.yaml`      | Idiomas y nivel, con `order`.                                                                  |

Cosas que conviene saber:

- Los años de cada habilidad se calculan solos a partir de `since`. Con `provisional: true` la web oculta los años y enseña solo el estado, hasta que confirmes la fecha.
- «Descargar CV» solo sale si `profile.yaml` declara `cv` (una ruta de `public/`, p. ej. `/assets/documents/curriculum.pdf`). Hoy no hay CV publicado.
- El año del copyright y si una certificación sigue vigente se calculan al compilar. Por eso el despliegue se repite a diario.
- `certifications.yaml` es opcional: si no tiene ninguna (`[]`), no hay hoja ni pestaña de certificaciones y cada build avisa «No items found», que es lo esperado. En YAML la sangría va con espacios, nunca con tabulaciones (`.editorconfig` ya lo pide para los `.yaml`).
- **Foto y documento de una certificación**: además del enlace de comprobación (`url`), deja los archivos en `src/assets/certifications/` con el `id` de la certificación como nombre: `<id>.png`, `.jpg`, `.jpeg` o `.webp` para la foto y `<id>.pdf` para el documento. No hay que declarar nada en el YAML. La foto sale a todo el ancho de la hoja, con la información debajo (en una caja de proporción 3:2 con la foto entera dentro, así una vertical no estira la hoja, y una certificación con foto ocupa casi una hoja: `PHOTO_WEIGHT` en [`src/lib/folder.ts`](src/lib/folder.ts)); el documento, como enlace «Ver documento (PDF)». Los dos se ven **dentro de la propia web**, en un visor modal ([`DocumentViewer.astro`](src/components/DocumentViewer.astro)) que se cierra con Esc, con el botón o pulsando fuera, y no descarga nada: la foto se amplía y el PDF se muestra con el visor del propio navegador en un `<iframe>` (por eso la CSP lleva `frame-src 'self'`). Los enlaces siguen siendo enlaces de verdad: sin JavaScript, con Ctrl/Cmd o clic central, o en un navegador que no puede mostrar un PDF dentro de una página (por ejemplo Chrome en Android, que reportaría `pdfViewerEnabled` falso), se abren en otra pestaña. Un texto alternativo propio para la foto va en `imageAlt` (`es:`, `ca:`, `en:`); sin él sale «Certificado: nombre». Un archivo con un nombre que no coincide con ningún `id`, con otra extensión o con la extensión en mayúsculas no se usaría, así que el build falla y dice cuál. Ojo: un certificado suele llevar tu nombre legal, a veces el DNI y un código QR, y todo lo que está en el repositorio es público; tapa lo que no quieras enseñar.
- La captura de cada proyecto es `src/assets/projects/<id>.png`, donde `<id>` es el `id` del YAML. Su texto alternativo va en `imageAlt`.
- Un proyecto que da para más puede llevar `details` (`intro`, `points` y, si quieres, `closing`): tendrá una segunda página justo detrás de la suya, como Cubezon.
- **Idiomas**: el sitio está en tres, con el español como principal (`/`) y el inglés (`/en/`) y el catalán (`/ca/`) como secundarios. El selector (`ES · EN · CA`) está en la barra, a la izquierda del botón del tema; son enlaces normales a la misma página en cada idioma, así que funcionan sin JavaScript, y al cambiar se conserva la hoja que se lee. La interfaz (menú, títulos de las hojas, botones…) está traducida en [`src/lib/ui.ts`](src/lib/ui.ts), y una clave sin traducir es un error al compilar. El **contenido** de los YAML se traduce a su ritmo: cada texto lleva `es:` y, si quieres, `ca:` y `en:`; lo que falte se muestra en español en las otras dos páginas. Limitación conocida: ese texto en español queda dentro de una página marcada como inglés o catalán, así que un lector de pantalla lo leerá con la voz equivocada hasta que se traduzca. Cada página declara su `lang`, su canónica, los `hreflang` de las tres y el `og:locale`; el sitemap lista las tres con sus alternativas.

## La carpeta

La página es una sola carpeta ([`src/components/Folder.astro`](src/components/Folder.astro)): la portada y, detrás, una página por apartado, en hojas de doble cara.

- **Qué páginas hay** lo decide [`src/lib/folder.ts`](src/lib/folder.ts) a partir de los datos: «Sobre mí», experiencia (tres trabajos por página), formación (cuatro), habilidades (dos categorías por página; los idiomas van en la última), certificaciones (cuatro), un proyecto por página (dos si tiene `details`) y contacto. Una sección sin datos no tiene página ni pestaña. Cuántos caben por página se cambia en `DEFAULT_SHEET_SIZES`.
- **Doble cara**: cada hoja lleva dos páginas ([`src/lib/book.ts`](src/lib/book.ts)). Con la carpeta abierta (desde 60rem de ancho) se ven dos a la vez: el reverso de la hoja pasada a la izquierda y el anverso de la siguiente a la derecha, así que cada giro enseña dos páginas nuevas. Más estrecha, se ve una página cada vez.
- **Parallax**: la carpeta llena la pantalla entre el menú y el pie, que siempre se ven, y se queda fija mientras la página se desplaza; el scroll hace girar las hojas sobre el lomo, y el recorrido acaba justo en la última hoja, con el pie ya a la vista. Se escala para llenar la pantalla, entre 0,65 y 2,4 veces su tamaño. Si ni encogida a 0,65 cabe (un móvil en vertical), no se fija y las hojas giran solas (el pie sigue visible). En una pantalla alta (desde 800 px) las hojas tienen proporción de folio, más altas que anchas, y la carpeta deja aire arriba y abajo. Mientras el scroll pasa las hojas, la portada lleva una flecha con «Haz scroll».
- **El scroll termina de pasar la hoja**: al parar entre dos hojas, la carpeta sigue en el sentido en que iba (basta mover un 4 % de la hoja, unos 22 px). Un toque de rueda o una flecha del teclado pasa una hoja entera; subir la devuelve. No se usan las paradas del navegador (`scroll-snap`): con ellas, un toque corto rebotaba a donde estaba y había que «cargar» el scroll. La lógica es [`settleTarget`](src/lib/pager.ts) y se coloca con `scrollend` y, además, con un rato sin moverse, porque Firefox no lo manda tras una rueda.
- **Otras formas de pasar hojas**: con el foco en la carpeta, las flechas, Re Pág, Av Pág, Inicio y Fin; deslizar el dedo a un lado; y las pestañas del menú, que llevan a la primera página de cada sección. Los anclajes de la v1 (`#about-me`, `#resume`, `#portfolio`, `#contact`) siguen llevando a su hoja.
- **Sin JavaScript** y al imprimir, las páginas salen todas seguidas, una debajo de otra.

## Pruebas en navegador

Además de los tests unitarios y de los del HTML compilado, `tests/e2e/` usa [Playwright](https://playwright.dev) sobre el sitio ya compilado y servido con `astro preview` (la CSP solo existe en el build). La primera vez hay que bajar los navegadores y compilar:

```bash
npx playwright install chromium firefox
npm run build
npm run test:e2e
```

| Archivo              | Qué vigila                                                                                                                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a11y.spec.ts`       | axe con las reglas WCAG hasta la 2.2 AA, en día y noche, en móvil y escritorio, con la carpeta abierta hoja por hoja y en la 404. El árbol de accesibilidad solo tiene las páginas que se leen.      |
| `layout.spec.ts`     | Sin desbordamiento horizontal de 320 a 1920 px, sin saltos al cargar (CLS; solo en Chromium, Firefox no lo mide), fuentes e imágenes.                                                                |
| `keyboard.spec.ts`   | Foco visible de dos tonos en todo lo enfocable (también dentro de las hojas), enlace para saltar al contenido, botón de tema, flechas para pasar hojas, menú siempre visible y que marca la sección. |
| `folder.spec.ts`     | La carpeta: llena la pantalla bajo el menú en cuatro tamaños, sin botones, el scroll gira las hojas, las dos páginas abiertas alineadas en el lomo, entrar por un ancla, móvil y sin JavaScript.     |
| `theme.spec.ts`      | Tema del sistema y elección guardada, la página sin JavaScript, movimiento reducido y colores forzados.                                                                                              |
| `contrast.spec.ts`   | Contraste real de cada renglón de texto sobre el fondo ya pintado (con el grano y los degradados), en día y noche, en cada posición de la carpeta y en la lista sin JavaScript.                      |
| `csp.spec.ts`        | La CSP no se incumple al usar el sitio, y de verdad bloquea un script en línea y una imagen de otro origen.                                                                                          |
| `lighthouse.spec.ts` | Rendimiento de 0,9 o más, y ninguna auditoría de accesibilidad, buenas prácticas o SEO fallida, en móvil y escritorio.                                                                               |
| `visual.spec.ts`     | Capturas de la portada, la experiencia y los proyectos en seis anchos (320 a 1920 px) en día y tres en noche, comparadas con las de referencia.                                                      |

Se ejecutan en el CI en cada pull request, menos las capturas. Lighthouse tiene una excepción explicada en el propio test: no puede leer `robots.txt` porque la CSP se lo impide (el archivo es válido y lo comprueba `test:dist`).

### Capturas de referencia

Las comparaciones visuales (`npm run test:visual`) no se versionan: pesan unos 12 MB por juego y el suavizado del texto cambia de un sistema a otro. Se usan así: antes de tocar el CSS o un componente, `npm run test:visual:update` guarda cómo se ve ahora; después de tocarlo, `npm run test:visual` dice qué anchos han cambiado y deja las diferencias en `test-results/`. Si el cambio es el que querías, se vuelven a generar. En las capturas se ocultan el grano, las imágenes y el pie, que pesan mucho o cambian solos.

## Sincronizar con LinkedIn

`experience.yaml` se puede poner al día desde LinkedIn. El importador **mueve las fechas que difieren y añade los registros que faltan**; nunca reescribe un texto que ya esté escrito ni borra nada, y sin `--write` solo enseña lo que haría. Empareja por nombre de empresa (o de centro y título, en la formación) y por fecha de inicio, así que dos puestos en la misma empresa siguen siendo dos. Los registros nuevos llevan el texto tal como viene de LinkedIn y una nota que pide revisarlo.

### Con el export de LinkedIn

1. En LinkedIn, «Obtener una copia de tus datos» (Configuración y privacidad → Privacidad de los datos). Basta con pedir las posiciones y la formación.
2. Descomprime el archivo y ejecuta, primero en simulación y luego escribiendo:

```bash
npm run import:linkedin -- ruta/de/la/carpeta
npm run import:linkedin -- ruta/de/la/carpeta --write
```

Busca `Positions.csv` y `Education.csv` en esa carpeta (`--positions` y `--education` aceptan rutas sueltas, y `--update-only` evita crear registros nuevos). Las filas que no se pueden leer, como una fecha rara, se listan al final en lugar de descartarse en silencio, y un texto que parezca incluir un correo, un teléfono o un enlace se marca para que lo quites antes de publicar. La simulación valida el resultado igual que `--write`, así que un dato que rompa el esquema se ve antes de escribir.

Una fecha con menos precisión que la de la web (`2022` frente a `2022-09`) no la sustituye, y un puesto nuevo en una empresa donde ya trabajaste, con más de dos años de diferencia, se añade como registro aparte en lugar de pisar el anterior.

### Con la API, de forma automática (opcional)

Solo para miembros de la UE, el EEE o Suiza: usa la Member Data Portability API de LinkedIn, que devuelve las mismas columnas que el export.

1. En LinkedIn Developers crea una app con la página de empresa «Member Data Portability (Member) Default Company» y pide el producto «Member Data Portability API (Member)».
2. Genera un token con el permiso `r_dma_portability_self_serve` (OAuth Token Tools del portal).
3. Guárdalo como secreto del repositorio con el nombre `LINKEDIN_ACCESS_TOKEN` (Settings → Secrets and variables → Actions).
4. En Settings → Actions → General activa «Allow GitHub Actions to create and approve pull requests».

El workflow [`linkedin-sync.yml`](.github/workflows/linkedin-sync.yml) corre el día 1 de cada mes y a mano (Actions → Sync LinkedIn → Run workflow). Descarga los datos, los aplica, comprueba que la web sigue compilando y pasando los tests y, si algo cambia, abre un pull request. Sin el secreto no hace nada. Va aparte del despliegue: un fallo aquí, por ejemplo con el token caducado, no impide publicar. Como el pull request lo crea el propio workflow, GitHub no lanza `ci.yml` sobre él; esas mismas comprobaciones ya se han pasado dentro del workflow.

Para probarlo en local, en dos pasos (el primero es el único que ve el token):

```bash
LINKEDIN_ACCESS_TOKEN=… npm run fetch:linkedin -- instantanea.json
npm run import:linkedin -- --json instantanea.json
```

Lo que conviene saber:

- Tras dar el consentimiento, LinkedIn tarda en preparar los datos: al principio contesta 404 y el importador avisa de que no hay posiciones.
- Según quienes lo han usado, el token dura aproximadamente un año y no se renueva solo (el portal puede enseñar un plazo menor). Apunta la fecha de caducidad.
- El token solo llega al paso que llama a la API, que carga únicamente el cliente de la API. El trabajo que ejecuta las dependencias de npm es de solo lectura, y el que tiene permiso de escritura no ejecuta npm. Un token con espacios o saltos de línea se rechaza antes de enviarlo, sin repetirlo en el error.
- Si ya hay un pull request abierto de la rama `chore/linkedin-sync`, el workflow no lo toca, por si lleva correcciones tuyas: revísalo o ciérralo.
- La rama, el pull request y el registro del workflow son públicos desde que se crean, antes de que revises el texto que viene de LinkedIn.
- El cliente de la API se probó con respuestas simuladas, con el formato publicado por LinkedIn y el que usan otros proyectos. No se ha probado contra una cuenta real: la primera vez, lánzalo a mano y revisa el pull request.

## Estructura

```text
src/
  components/   Piezas de la página (la carpeta, sus hojas y páginas, el menú, el sello).
  data/         Contenido en YAML.
  layouts/      Base.astro: <head>, metadatos, tema.
  lib/          Lógica pura con tests (edad, colores, orden, SEO, esquemas…).
  pages/        index, 404 y theme.css (las paletas, generadas desde src/lib/theme.ts).
  scripts/      theme-init.js: fija el tema antes de pintar.
  styles/       Tokens y estilos globales.
tests/
  unit/         Config de Astro y datos.
  build/        El HTML ya compilado (necesita `npm run build`).
  e2e/          Pruebas en navegador con Playwright.
scripts/        Generadores de favicon e imagen para compartir, e importador de LinkedIn.
```

## Seguridad

GitHub Pages no permite fijar cabeceras HTTP, así que la política de contenido (CSP) va en una etiqueta `<meta>` que Astro genera con `security.csp` en [`astro.config.mjs`](astro.config.mjs).

- Todo está denegado por defecto (`default-src 'none'`). Solo se abren imágenes, fuentes, scripts y hojas de estilo del propio sitio.
- No hay scripts de terceros. Si añades uno, la CSP lo bloqueará hasta que lo permitas a propósito en esa configuración.
- El único script ejecutable en línea fija el tema antes de pintar, para que no haya parpadeo. Su hash lo calcula `astro.config.mjs` del propio `src/scripts/theme-init.js`: si lo editas, el hash cambia solo. Los saltos de línea se normalizan a LF, como hace el navegador, para que un checkout con CRLF no lo invalide.
- Limitación: Astro coloca la meta de la CSP al final del `<head>` y una meta solo gobierna lo que viene después. Ese script y el resto de lo que la precede (metadatos, JSON-LD, enlaces a `theme.css` y a las fuentes) se ejecutan antes de que exista la política, así que el hash es hoy una garantía por si cambia el orden. `npm run test:dist` fija exactamente qué hay antes de la meta, para que no crezca sin que se decida.
- Los estilos en línea se limitan a atributos `style`, que es como cada página recibe su giro en la lista sin JavaScript (`--tilt`). El resto de valores de la carpeta los pone el script con el CSSOM, que la CSP no restringe.
- `npm run test:dist` comprueba sobre el HTML compilado que cada script en línea tiene su hash, que no se carga nada de otros orígenes y que los datos estructurados no incluyen el correo ni la fecha de nacimiento.

El correo sale en la sección de contacto, como ya hacía la v1 en su enlace `mailto:`; no va en los datos estructurados.

## Despliegue

Lo hace GitHub Actions ([`deploy.yml`](.github/workflows/deploy.yml)) en cada push a `main` y una vez al día. Antes de publicar pasan los tipos, los tests, el build y los tests del HTML compilado. Los pull requests pasan las mismas comprobaciones, más la del formato, en [`ci.yml`](.github/workflows/ci.yml).

Para que funcione, en el repositorio hay que fijar **Settings → Pages → Source = GitHub Actions**. Si queda en «Deploy from a branch», la rama servirá código fuente y no el sitio.

## Versión anterior

El sitio de la v1 (plantilla con jQuery) se conserva en el tag [`v1.3.0`](../../tree/v1.3.0).

## Licencia

[GPL-3.0](LICENSE).
