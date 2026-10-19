import { createServer, type AddressInfo } from 'node:net';
import { chromium, expect, test } from '@playwright/test';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

test.skip(
	({ browserName }) => browserName !== 'chromium',
	'Lighthouse solo funciona con Chromium.',
);

const PERFORMANCE_MINIMUM = 0.9;

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
	failing: string[];
}

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

async function audit(
	url: string,
	device: 'mobile' | 'desktop',
): Promise<Result> {
	const port = await freePort();
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
