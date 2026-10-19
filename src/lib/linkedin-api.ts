import type { LinkedinRow } from './linkedin.ts';

export type SnapshotDomain = 'POSITIONS' | 'EDUCATION';

const SNAPSHOT_URL = 'https://api.linkedin.com/rest/memberSnapshotData';
/** Única versión que aceptan estos endpoints: otra devuelve 426. */
const API_VERSION = '202312';
/** Una persona tiene un puñado de posiciones; pasar de aquí es un fallo, no datos. */
const MAX_PAGES = 10;
const REQUEST_TIMEOUT_MS = 15_000;

export class LinkedinApiError extends Error {
	readonly status: number | null;

	constructor(message: string, status: number | null = null) {
		super(message);
		this.name = 'LinkedinApiError';
		this.status = status;
	}
}

/**
 * Qué significa cada fallo, en el idioma del proyecto. Nunca incluye el cuerpo de la respuesta ni
 * la petición: podrían repetir el token.
 */
function describeFailure(status: number): string {
	switch (status) {
		case 401:
			return 'LinkedIn rechazó el token (401): ha caducado o no es válido. Genera uno nuevo; dura aproximadamente un año.';
		case 403:
			return 'LinkedIn denegó el acceso (403): el token necesita el permiso r_dma_portability_self_serve y la cuenta debe estar en la UE/EEE o en Suiza.';
		case 426:
			return `LinkedIn no acepta la versión de API ${API_VERSION} (426): hay que actualizarla en src/lib/linkedin-api.ts.`;
		default:
			return `LinkedIn respondió con un error (${status}).`;
	}
}

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const toRow = (value: Record<string, unknown>): LinkedinRow =>
	Object.fromEntries(
		Object.entries(value).map(([column, cell]) => [
			column,
			String(cell ?? ''),
		]),
	);

function rowsOf(body: unknown): LinkedinRow[] {
	if (!isObject(body) || !Array.isArray(body.elements)) return [];

	return body.elements.flatMap((element: unknown) =>
		isObject(element) && Array.isArray(element.snapshotData)
			? element.snapshotData.filter(isObject).map(toRow)
			: [],
	);
}

/** Una página del dominio; `null` si LinkedIn no tiene (más) datos, que contesta 404. */
async function fetchPage(
	domain: SnapshotDomain,
	page: number,
	token: string,
	fetchImpl: typeof fetch,
): Promise<LinkedinRow[] | null> {
	const url = `${SNAPSHOT_URL}?q=criteria&domain=${domain}&start=${page}`;

	let response: Response;
	try {
		response = await fetchImpl(url, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Linkedin-Version': API_VERSION,
			},
			// La URL es fija: una redirección no es normal, y no hay motivo para enviar el token a otro sitio.
			redirect: 'error',
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
	} catch (error) {
		const reason =
			error instanceof Error ? error.message : 'error desconocido';

		throw new LinkedinApiError(
			`No se pudo conectar con LinkedIn: ${reason}`,
		);
	}

	if (response.status === 404) return null;
	if (!response.ok) {
		throw new LinkedinApiError(
			describeFailure(response.status),
			response.status,
		);
	}

	try {
		return rowsOf(await response.json());
	} catch {
		throw new LinkedinApiError(
			'LinkedIn devolvió una respuesta que no es JSON',
		);
	}
}

const rowKey = (row: LinkedinRow): string =>
	JSON.stringify(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)));

/**
 * Todas las filas de un dominio del Member Snapshot API. Sigue las páginas hasta que LinkedIn
 * contesta 404 o una página no trae nada nuevo (el total que informa no es fiable y repite filas
 * entre páginas). Sin datos todavía —la instantánea se prepara tras dar el consentimiento— devuelve
 * una lista vacía.
 */
export async function fetchSnapshotDomain(
	domain: SnapshotDomain,
	token: string,
	fetchImpl: typeof fetch = fetch,
): Promise<LinkedinRow[]> {
	const accessToken = token.trim();
	if (accessToken === '') {
		throw new LinkedinApiError(
			'Falta el token de LinkedIn: define la variable LINKEDIN_ACCESS_TOKEN',
		);
	}

	// Un token con espacios o saltos de línea (mal pegado) hace que `fetch` falle con un mensaje
	// que lo repite entero: se rechaza antes, con un texto fijo.
	if (!/^[\x21-\x7e]+$/.test(accessToken)) {
		throw new LinkedinApiError(
			'El token de LinkedIn no es válido: tiene espacios, saltos de línea u otros caracteres que no caben en una cabecera. Cópialo de nuevo, sin nada alrededor.',
		);
	}

	const rows: LinkedinRow[] = [];
	const seen = new Set<string>();

	for (let page = 0; page < MAX_PAGES; page += 1) {
		const pageRows = await fetchPage(domain, page, accessToken, fetchImpl);
		if (pageRows === null) return rows;

		const fresh = pageRows.filter((row) => {
			const key = rowKey(row);
			if (seen.has(key)) return false;
			seen.add(key);

			return true;
		});
		if (fresh.length === 0) return rows;

		rows.push(...fresh);
	}

	throw new LinkedinApiError(
		`LinkedIn devolvió más de ${MAX_PAGES} páginas de ${domain}: no sigo para no descargar sin fin`,
	);
}
