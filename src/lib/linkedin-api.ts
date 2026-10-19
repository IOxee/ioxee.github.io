import type { LinkedinRow } from './linkedin.ts';

export type SnapshotDomain = 'POSITIONS' | 'EDUCATION';

const SNAPSHOT_URL = 'https://api.linkedin.com/rest/memberSnapshotData';
/** The only version these endpoints accept: any other returns 426. */
const API_VERSION = '202312';
/** A person has a handful of positions; going past this is a failure, not data. */
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
 * What each failure means, in the project's language. It never includes the response body or
 * the request: they could repeat the token.
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

/** One page of the domain; `null` if LinkedIn has no (more) data, which it answers with 404. */
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
			// The URL is fixed: a redirect is not normal, and there is no reason to send the token somewhere else.
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
 * All the rows of a Member Snapshot API domain. It follows the pages until LinkedIn
 * answers 404 or a page brings nothing new (the total it reports is not reliable and it repeats rows
 * between pages). With no data yet —the snapshot is prepared after consent is given— it returns
 * an empty list.
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

	// A token with spaces or line breaks (badly pasted) makes `fetch` fail with a message
	// that repeats it in full: it is rejected beforehand, with a fixed text.
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
