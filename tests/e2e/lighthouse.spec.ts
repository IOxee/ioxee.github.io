import { createServer, type AddressInfo } from 'node:net';
import { chromium, expect, test } from '@playwright/test';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

// Lighthouse necesita Chromium (no habla con Firefox) y mide el sitio compilado.
test.skip(
	({ browserName }) => browserName !== 'chromium',
	'Lighthouse solo funciona con Chromium.',
);

/** Puntuación mínima de rendimiento, de 0 a 1. Varía con la máquina, así que deja margen. */
const PERFORMANCE_MINIMUM = 0.9;

/** Las categorías donde no se tolera ninguna auditoría fallida: son de corrección, no de ritmo. */
const STRICT = ['accessibility', 'best-practices', 'seo'] as const;

/**
 * Auditorías que fallan por una causa conocida y que no es un fallo del sitio. Cada una explica
 * por qué; si la causa desaparece, hay que quitarla de aquí.
 */
const KNOWN: Record<string, string> = {
	// Lighthouse lee robots.txt desde dentro de la página, y la CSP (`default-src 'none'`, que
	// cierra también `connect-src`) se lo impide. El archivo es válido: lo comprueba
	// `tests/build/seo.test.ts` y no hay motivo para abrir la CSP solo para esta auditoría.
	'robots-txt': 'la CSP impide que Lighthouse descargue el archivo',
};

interface Result {
	performance: number;
	/** Auditorías de corrección que no sacan un 1 y no están explicadas en `KNOWN`. */
	failing: string[];
}

/** Un puerto libre, para que ninguna ejecución choque con otra ni con otro proceso. */
function freePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.on('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const { port } = server.address() as AddressInfo;
			server.close(() => resolve(port));
		});
	});
}

/** Lo que dice Lighthouse de una dirección, en móvil (por defecto) o en escritorio. */
async function audit(
	url: string,
	device: 'mobile' | 'desktop',
): Promise<Result> {
	const port = await freePort();
	// Cada ejecución lleva su propio Chromium con el puerto de depuración que Lighthouse necesita.
	const browser = await chromium.launch({
		args: [`--remote-debugging-port=${port}`],
	});

	try {
		const result = await lighthouse(
			url,
			{
				// Por IPv4, que es donde escucha el puerto de depuración (`localhost` puede ir por IPv6).
				hostname: '127.0.0.1',
				port,
				output: 'json',
				logLevel: 'error',
				onlyCategories: ['performance', ...STRICT],
			},
			device === 'desktop' ? desktopConfig : undefined,
		);
		const lhr = result?.lhr;
		if (!lhr) throw new Error('Lighthouse no devolvió resultados');

		const failing = STRICT.flatMap((category) =>
			(lhr.categories[category]?.auditRefs ?? [])
				.filter((ref) => ref.weight > 0 && !(ref.id in KNOWN))
				.map((ref) => ({ category, audit: lhr.audits[ref.id] }))
				// Una auditoría que dio error no tiene nota (`null`): no cuenta como aprobada.
				.filter(
					({ audit }) =>
						audit &&
						(audit.scoreDisplayMode === 'error' ||
							(audit.score ?? 1) < 1),
				)
				.map(({ category, audit }) =>
					[
						`${category}/${audit?.id}: ${audit?.title}`,
						audit?.explanation,
					]
						.filter(Boolean)
						.join(' '),
				),
		);
		// Si Lighthouse mismo falló, lo demás no vale: se dice así y no como «rendimiento 0».
		if (lhr.runtimeError) {
			failing.unshift(`Lighthouse falló: ${lhr.runtimeError.message}`);
		}

		return {
			performance: lhr.categories.performance?.score ?? 0,
			failing,
		};
	} finally {
		await browser.close();
	}
}

test.describe('Lighthouse', { tag: '@lighthouse' }, () => {
	// Una detrás de otra: dos auditorías a la vez se robarían CPU y torcerían la nota de rendimiento.
	test.describe.configure({ mode: 'serial' });
	// Cada auditoría arranca su propio navegador y tarda; no hay prisa, pero tampoco se cuelga.
	test.setTimeout(120_000);

	for (const device of ['mobile', 'desktop'] as const) {
		test(`cumple en ${device === 'mobile' ? 'móvil' : 'escritorio'}: rendimiento y ninguna auditoría de accesibilidad, buenas prácticas o SEO fallida`, async ({
			baseURL,
		}) => {
			const { performance, failing } = await audit(`${baseURL}/`, device);

			expect(failing).toEqual([]);
			expect(performance).toBeGreaterThanOrEqual(PERFORMANCE_MINIMUM);
		});
	}
});
