# ioxee.github.io

Portfolio de [Isidro Rosell](https://ioxee.github.io/), programador full-stack. Está hecho con [Astro](https://astro.build) y TypeScript, sin jQuery, y se publica como sitio estático en GitHub Pages.

El diseño es una cartilla de racionamiento de juego de supervivencia zombi: el carné de la portada y el resto de secciones como hojas de papel sobre una mesa, con tema de día y de noche.

## Empezar

Para compilar basta Node 22.12; los scripts `assets:*` ejecutan TypeScript directamente y necesitan Node 22.18 o superior.

```bash
npm install
npm run dev
```

El servidor de desarrollo queda en <http://localhost:4321>.

## Comandos

| Comando                 | Qué hace                                                                     |
| ----------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`           | Servidor de desarrollo.                                                      |
| `npm run build`         | Compila el sitio en `dist/`.                                                 |
| `npm run preview`       | Sirve `dist/`. Es la forma de probar la CSP, que en `dev` no se aplica.      |
| `npm run check`         | Comprueba los tipos de TypeScript y de los `.astro`.                         |
| `npm test`              | Tests unitarios y de los datos.                                              |
| `npm run test:coverage` | Lo mismo, exigiendo un 80 % de cobertura por archivo en `src/lib/`.          |
| `npm run test:dist`     | Tests sobre el HTML compilado (CSP, SEO, enlaces). Necesita `npm run build`. |
| `npm run format`        | Da formato con Prettier. `format:check` solo comprueba.                      |
| `npm run assets:brand`  | Regenera el favicon («IO») y el icono de Apple en `public/`.                 |
| `npm run assets:og`     | Regenera `public/og.jpg`, la imagen al compartir. Necesita `npm run build`.  |

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
scripts/        Generadores de favicon e imagen para compartir.
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
