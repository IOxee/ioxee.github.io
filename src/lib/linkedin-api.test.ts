import { describe, expect, it, vi } from 'vitest';
import { LinkedinApiError, fetchSnapshotDomain } from './linkedin-api.ts';

const TOKEN = 'secret-token-value';

const json = (body: unknown, status = 200): Response =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const page = (...rows: Record<string, unknown>[]) =>
	json({
		paging: { start: 0, count: rows.length, total: rows.length },
		elements: [{ snapshotDomain: 'POSITIONS', snapshotData: rows }],
	});

const notFound = () => json({ status: 404, message: 'No data found' }, 404);

/** `fetch` falso que responde con cada respuesta de la lista, en orden. */
function fakeFetch(...responses: (Response | Error)[]) {
	const queue = [...responses];

	return vi.fn(async (..._args: Parameters<typeof fetch>) => {
		const next = queue.shift();
		if (!next) throw new Error('Más peticiones de las esperadas');
		if (next instanceof Error) throw next;

		return next;
	});
}

describe('fetchSnapshotDomain', () => {
	it('asks the Member Snapshot API for the domain, page by page, with the token and API version', async () => {
		const fetchMock = fakeFetch(page({ Title: 'Dev' }), notFound());

		await fetchSnapshotDomain('POSITIONS', TOKEN, fetchMock);

		const [firstUrl, firstInit] = fetchMock.mock.calls[0] ?? [];
		expect(String(firstUrl)).toBe(
			'https://api.linkedin.com/rest/memberSnapshotData?q=criteria&domain=POSITIONS&start=0',
		);
		expect(firstInit?.headers).toEqual({
			Authorization: `Bearer ${TOKEN}`,
			'Linkedin-Version': '202312',
		});
		expect(String(fetchMock.mock.calls[1]?.[0])).toContain('start=1');
	});

	it('returns the rows with every value as text', async () => {
		const fetchMock = fakeFetch(
			page({ 'Company Name': 'Acme', Count: 3, Empty: null }),
			notFound(),
		);

		expect(
			await fetchSnapshotDomain('POSITIONS', TOKEN, fetchMock),
		).toEqual([{ 'Company Name': 'Acme', Count: '3', Empty: '' }]);
	});

	it('joins the pages and drops the rows the API repeats between them', async () => {
		const fetchMock = fakeFetch(
			page({ Title: 'A' }, { Title: 'B' }),
			page({ Title: 'B' }, { Title: 'C' }),
			notFound(),
		);

		const rows = await fetchSnapshotDomain('POSITIONS', TOKEN, fetchMock);

		expect(rows.map((row) => row.Title)).toEqual(['A', 'B', 'C']);
	});

	it('stops when a page brings nothing new, since the total it reports is not reliable', async () => {
		const fetchMock = fakeFetch(page({ Title: 'A' }), page({ Title: 'A' }));

		expect(
			await fetchSnapshotDomain('POSITIONS', TOKEN, fetchMock),
		).toHaveLength(1);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('returns no rows when LinkedIn has no data for the domain yet (a 404 on the first page)', async () => {
		const fetchMock = fakeFetch(notFound());

		expect(
			await fetchSnapshotDomain('EDUCATION', TOKEN, fetchMock),
		).toEqual([]);
	});

	it('ignores elements that are not shaped like snapshot data', async () => {
		const fetchMock = fakeFetch(
			json({
				elements: [
					{},
					{ snapshotData: 'nope' },
					{ snapshotData: [1, 'x', { A: 'ok' }] },
				],
			}),
			notFound(),
		);

		expect(
			await fetchSnapshotDomain('POSITIONS', TOKEN, fetchMock),
		).toEqual([{ A: 'ok' }]);
	});

	it.each([
		[401, /token/i],
		[403, /r_dma_portability_self_serve/],
		[426, /versi/i],
		[500, /500/],
	])(
		'explains a %i without ever showing the token',
		async (status, message) => {
			const fetchMock = fakeFetch(
				json({ message: `Bearer ${TOKEN} rejected` }, status),
			);

			const error = await fetchSnapshotDomain(
				'POSITIONS',
				TOKEN,
				fetchMock,
			).catch((caught: unknown) => caught);

			expect(error).toBeInstanceOf(LinkedinApiError);
			expect((error as LinkedinApiError).status).toBe(status);
			expect((error as LinkedinApiError).message).toMatch(message);
			expect((error as LinkedinApiError).message).not.toContain(TOKEN);
		},
	);

	it('reports a connection failure without the token', async () => {
		const fetchMock = fakeFetch(new TypeError('fetch failed'));

		const error = await fetchSnapshotDomain(
			'POSITIONS',
			TOKEN,
			fetchMock,
		).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(LinkedinApiError);
		expect((error as LinkedinApiError).message).toMatch(/conectar/);
		expect((error as LinkedinApiError).message).not.toContain(TOKEN);
	});

	it('reports a connection failure even when what was thrown is not an Error', async () => {
		const failing = vi.fn(async () => {
			throw 'connection reset';
		});

		await expect(
			fetchSnapshotDomain('POSITIONS', TOKEN, failing),
		).rejects.toThrow(/conectar con LinkedIn: error desconocido/);
	});

	it('rejects a reply that is not JSON', async () => {
		const fetchMock = fakeFetch(new Response('<html>', { status: 200 }));

		await expect(
			fetchSnapshotDomain('POSITIONS', TOKEN, fetchMock),
		).rejects.toThrow(/JSON/);
	});

	it('gives up instead of paging forever when every page brings new rows', async () => {
		let n = 0;
		const endless = vi.fn(async () => page({ Title: `T${(n += 1)}` }));

		await expect(
			fetchSnapshotDomain('POSITIONS', TOKEN, endless),
		).rejects.toThrow(/p[aá]ginas/);
		expect(endless.mock.calls.length).toBeLessThanOrEqual(10);
	});

	it.each(['abc\ndef', 'abc def', 'tökén', 'abc\u0000def'])(
		'refuses the token %j before any request, and does not echo it',
		async (token) => {
			const fetchMock = fakeFetch();

			const error = await fetchSnapshotDomain(
				'POSITIONS',
				token,
				fetchMock,
			).catch((caught: unknown) => caught);

			expect(error).toBeInstanceOf(LinkedinApiError);
			expect((error as LinkedinApiError).message).toMatch(/token/i);
			expect((error as LinkedinApiError).message).not.toContain('abc');
			expect(fetchMock).not.toHaveBeenCalled();
		},
	);

	it('never follows a redirect, so the token cannot be sent anywhere else', async () => {
		const fetchMock = fakeFetch(notFound());

		await fetchSnapshotDomain('POSITIONS', TOKEN, fetchMock);

		expect(fetchMock.mock.calls[0]?.[1]?.redirect).toBe('error');
	});

	it('does not make a single request without a token', async () => {
		const fetchMock = fakeFetch();

		await expect(
			fetchSnapshotDomain('POSITIONS', '   ', fetchMock),
		).rejects.toThrow(/LINKEDIN_ACCESS_TOKEN/);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
