/**
 * Genera el favicon y el icono de Apple a partir de la paleta del sitio, para que los iconos
 * no se queden con colores viejos si cambia el diseño.
 *
 * Uso: `npm run assets:brand` (Node 22.19 o superior, que ejecuta TypeScript sin compilar).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { oklchToHex } from '../src/lib/color.ts';
import { PALETTES } from '../src/lib/theme.ts';

const KRAFT = oklchToHex(PALETTES.day.paper);
const VIOLET = oklchToHex(PALETTES.day.ink);

/**
 * Monograma «IO», el comienzo del alias ioxee: una «I» de stencil (dos barras separadas por el
 * puente de la plantilla) y una «O» que es el anillo de un sello. `rounded` redondea las esquinas;
 * el icono de Apple va a sangre porque iOS ya aplica su propia máscara.
 */
const icon = (rounded: boolean): string =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
	`<rect width="32" height="32"${rounded ? ' rx="6"' : ''} fill="${KRAFT}"/>` +
	`<rect x="5.6" y="8" width="4.8" height="6.6" fill="${VIOLET}"/>` +
	`<rect x="5.6" y="17.4" width="4.8" height="6.6" fill="${VIOLET}"/>` +
	`<circle cx="21.2" cy="16" r="6" fill="none" stroke="${VIOLET}" stroke-width="3.6"/>` +
	`</svg>`;

const png = (svg: string, size: number): Promise<Buffer> =>
	sharp(Buffer.from(svg), { density: 600 })
		.resize(size, size)
		.png()
		.toBuffer();

/** ICO con imágenes PNG dentro: lo entienden todos los navegadores actuales y evita una librería. */
function ico(images: readonly { size: number; data: Buffer }[]): Buffer {
	const header = Buffer.alloc(6);
	header.writeUInt16LE(1, 2); // tipo: icono
	header.writeUInt16LE(images.length, 4);

	let offset = 6 + images.length * 16;
	const entries = images.map(({ size, data }) => {
		const entry = Buffer.alloc(16);
		entry.writeUInt8(size, 0);
		entry.writeUInt8(size, 1);
		entry.writeUInt16LE(1, 4); // planos de color
		entry.writeUInt16LE(32, 6); // bits por píxel
		entry.writeUInt32LE(data.length, 8);
		entry.writeUInt32LE(offset, 12);
		offset += data.length;

		return entry;
	});

	return Buffer.concat([
		header,
		...entries,
		...images.map((image) => image.data),
	]);
}

mkdirSync('public', { recursive: true });

writeFileSync('public/favicon.svg', icon(true));
writeFileSync('public/apple-touch-icon.png', await png(icon(false), 180));
writeFileSync(
	'public/favicon.ico',
	ico(
		await Promise.all(
			[16, 32, 48].map(async (size) => ({
				size,
				data: await png(icon(true), size),
			})),
		),
	),
);

console.log(
	`Iconos generados en public/ con papel ${KRAFT} y tinta ${VIOLET}.`,
);
