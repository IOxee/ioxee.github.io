# ioxee.github.io

Portfolio de [Isidro Rosell](https://ioxee.github.io/), programador full-stack. Está hecho con [Astro](https://astro.build) y TypeScript, sin jQuery, y se publica como sitio estático en GitHub Pages.

El diseño es una cartilla de racionamiento de juego de supervivencia zombi: el carné de la portada y el resto de secciones como hojas de papel sobre una mesa, con tema de día y de noche.

## Empezar

Hace falta Node 22.18 o superior: los scripts (`assets:*`, `import:linkedin`, `fetch:linkedin`) y sus tests ejecutan TypeScript directamente.

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
| `npm run format`          | Da formato con Prettier. `format:check` solo comprueba.                      |
| `npm run assets:brand`    | Regenera el favicon («IO») y el icono de Apple en `public/`.                 |
| `npm run assets:og`       | Regenera `public/og.jpg`, la imagen al compartir. Necesita `npm run build`.  |
| `npm run import:linkedin` | Pone al día `experience.yaml` con el export de LinkedIn. Ver más abajo.      |
| `npm run fetch:linkedin`  | Descarga de la API de LinkedIn una instantánea en JSON (necesita el token).  |

## Cambiar el contenido

Todo lo que se lee en la página sale de `src/data/*.yaml`. No hay que tocar componentes para actualizarlo. El build lo valida con un esquema ([`src/lib/schemas.ts`](src/lib/schemas.ts)) y falla con un mensaje claro si algo no cuadra.

| Archivo           | Contenido                                                                              |
| ----------------- | -------------------------------------------------------------------------------------- |
| `profile.yaml`    | Nombre, titular, fecha de nacimiento (para la edad), «Sobre mí», enlaces.              |
| `experience.yaml` | Trabajo y formación. Las fechas son `'AAAA'` o `'AAAA-MM'`; `end: null` es «en curso». |
| `skills.yaml`     | Habilidades: año de inicio y uso (`daily`, `comfortable`, `intermediate`, `basic`).    |
| `projects.yaml`   | Proyectos, con `order` para fijar la posición.                                         |
| `languages.yaml`  | Idiomas y nivel, con `order`.                                                          |

Cosas que conviene saber:

- Los años de cada habilidad se calculan solos a partir de `since`. Con `provisional: true` la web oculta los años y enseña solo el estado, hasta que confirmes la fecha.
- «Descargar CV» solo sale si `profile.yaml` declara `cv` (una ruta de `public/`, p. ej. `/assets/documents/curriculum.pdf`). Hoy no hay CV publicado.
- La edad y el año del copyright se calculan al compilar. Por eso el despliegue se repite a diario.
- La captura de cada proyecto es `src/assets/projects/<id>.png`, donde `<id>` es el `id` del YAML. Su texto alternativo va en `imageAlt`.
- El sitio se publica solo en español. El catalán y el inglés están configurados: se activan añadiendo `ca:` y `en:` a los textos y las traducciones de `src/lib/ui.ts`; mientras falten, se muestra el español.

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
  components/   Piezas de la página (cartilla, hojas, sellos, secciones).
  data/         Contenido en YAML.
  layouts/      Base.astro: <head>, metadatos, tema.
  lib/          Lógica pura con tests (edad, colores, orden, SEO, esquemas…).
  pages/        index, 404 y theme.css (las paletas, generadas desde src/lib/theme.ts).
  scripts/      theme-init.js: fija el tema antes de pintar.
  styles/       Tokens y estilos globales.
tests/
  unit/         Config de Astro y datos.
  build/        El HTML ya compilado (necesita `npm run build`).
scripts/        Generadores de favicon e imagen para compartir, e importador de LinkedIn.
```

## Seguridad

GitHub Pages no permite fijar cabeceras HTTP, así que la política de contenido (CSP) va en una etiqueta `<meta>` que Astro genera con `security.csp` en [`astro.config.mjs`](astro.config.mjs).

- Todo está denegado por defecto (`default-src 'none'`). Solo se abren imágenes, fuentes, scripts y hojas de estilo del propio sitio.
- No hay scripts de terceros. Si añades uno, la CSP lo bloqueará hasta que lo permitas a propósito en esa configuración.
- El único script ejecutable en línea fija el tema antes de pintar, para que no haya parpadeo. Su hash lo calcula `astro.config.mjs` del propio `src/scripts/theme-init.js`: si lo editas, el hash cambia solo. Los saltos de línea se normalizan a LF, como hace el navegador, para que un checkout con CRLF no lo invalide.
- Limitación: Astro coloca la meta de la CSP al final del `<head>` y una meta solo gobierna lo que viene después. Ese script y el resto de lo que la precede (metadatos, JSON-LD, enlaces a `theme.css` y a las fuentes) se ejecutan antes de que exista la política, así que el hash es hoy una garantía por si cambia el orden. `npm run test:dist` fija exactamente qué hay antes de la meta, para que no crezca sin que se decida.
- Los estilos en línea se limitan a atributos `style`, que es como cada hoja recibe su giro (`--tilt`).
- `npm run test:dist` comprueba sobre el HTML compilado que cada script en línea tiene su hash, que no se carga nada de otros orígenes y que los datos estructurados no incluyen el correo ni la fecha de nacimiento.

El correo sale en la sección de contacto, como ya hacía la v1 en su enlace `mailto:`; no va en los datos estructurados.

## Despliegue

Lo hace GitHub Actions ([`deploy.yml`](.github/workflows/deploy.yml)) en cada push a `main` y una vez al día. Antes de publicar pasan los tipos, los tests, el build y los tests del HTML compilado. Los pull requests pasan las mismas comprobaciones, más la del formato, en [`ci.yml`](.github/workflows/ci.yml).

Para que funcione, en el repositorio hay que fijar **Settings → Pages → Source = GitHub Actions**. Si queda en «Deploy from a branch», la rama servirá código fuente y no el sitio.

## Versión anterior

El sitio de la v1 (plantilla con jQuery) se conserva en el tag [`v1.3.0`](../../tree/v1.3.0).

## Licencia

[GPL-3.0](LICENSE).
