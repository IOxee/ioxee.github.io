import { describe, expect, it } from 'vitest';
import {
	educationToEntries,
	parseLinkedinCsv,
	parseLinkedinDate,
	parseSnapshot,
	positionsToEntries,
} from './linkedin.ts';

describe('parseSnapshot', () => {
	it('reads the file written by the fetch script', () => {
		const snapshot = JSON.stringify({
			positions: [{ 'Company Name': 'Acme' }],
			education: [],
		});

		expect(parseSnapshot(snapshot)).toEqual({
			positions: [{ 'Company Name': 'Acme' }],
			education: [],
		});
	});

	it('leaves out a section the file does not have', () => {
		expect(parseSnapshot('{"positions": []}')).toEqual({ positions: [] });
	});

	it.each([
		['not json at all', /JSON/],
		['[]', /objeto/],
		['{"positions": "x"}', /positions/],
		['{"positions": [1]}', /positions/],
		['{"education": [{"School Name": 3}]}', /education/],
	])('refuses %j', (text, message) => {
		expect(() => parseSnapshot(text)).toThrow(message);
	});
});

describe('parseLinkedinDate', () => {
	it.each([
		['2005', '2005'],
		['Mar 2022', '2022-03'],
		['March 2022', '2022-03'],
		['sept 2020', '2020-09'],
		['mar. 2022', '2022-03'],
		['ene 2023', '2023-01'],
		['enero de 2023', '2023-01'],
		['dic 2021', '2021-12'],
		['gener 2023', '2023-01'],
		['març 2021', '2021-03'],
		['maig 2018', '2018-05'],
		['juny 2020', '2020-06'],
		['juliol 2020', '2020-07'],
		['agost 2020', '2020-08'],
		['novembre 2019', '2019-11'],
		['desembre 2019', '2019-12'],
		['03/2022', '2022-03'],
		['2022-03', '2022-03'],
		['2022-3', '2022-03'],
		['  Jun 2019  ', '2019-06'],
	])('reads %j as %j', (text, expected) => {
		expect(parseLinkedinDate(text)).toBe(expected);
	});

	it.each(['', '   '])('treats the empty value %j as "no date"', (text) => {
		expect(parseLinkedinDate(text)).toBeNull();
	});

	it.each([
		'Foo 2022',
		'Marketing 2022',
		'ma 2022',
		'13/2022',
		'2022-13',
		'next year',
		'22',
		'2022-00',
	])('refuses to guess a date from %j', (text) => {
		expect(() => parseLinkedinDate(text)).toThrow(RangeError);
		expect(() => parseLinkedinDate(text)).toThrow(text.trim());
	});
});

describe('parseLinkedinCsv', () => {
	const header = 'Company Name,Title,Started On';

	it('reads quoted commas and line breaks inside a field', () => {
		const csv = `${header}\n"Acme, Inc","Dev\nOps",Mar 2022\n`;

		expect(parseLinkedinCsv(csv, 'Company Name')).toEqual([
			{
				'Company Name': 'Acme, Inc',
				Title: 'Dev\nOps',
				'Started On': 'Mar 2022',
			},
		]);
	});

	it('keeps a bare quote inside an unquoted field instead of failing the whole file', () => {
		const csv = `${header}\n5" screens,Dev,2020\n`;

		expect(parseLinkedinCsv(csv, 'Company Name')[0]).toMatchObject({
			'Company Name': '5" screens',
		});
	});

	it('ignores the byte order mark and trims the values', () => {
		const csv = `﻿${header}\n  Acme  , Dev ,2020\n`;

		expect(parseLinkedinCsv(csv, 'Company Name')).toEqual([
			{ 'Company Name': 'Acme', Title: 'Dev', 'Started On': '2020' },
		]);
	});

	it('skips the notes LinkedIn puts before the header in some files', () => {
		const csv = `Notes:\n"Some explanation, with a comma"\n\n${header}\nAcme,Dev,2020\n`;

		expect(parseLinkedinCsv(csv, 'Company Name')).toEqual([
			{ 'Company Name': 'Acme', Title: 'Dev', 'Started On': '2020' },
		]);
	});

	it('skips blank lines and fills the missing cells of a short row', () => {
		const csv = `${header}\n\nAcme\n`;

		expect(parseLinkedinCsv(csv, 'Company Name')).toEqual([
			{ 'Company Name': 'Acme', Title: '', 'Started On': '' },
		]);
	});

	it('returns no rows for a file that only has the header', () => {
		expect(parseLinkedinCsv(`${header}\n`, 'Company Name')).toEqual([]);
	});

	it('names the missing column, which means this is not the file that was expected', () => {
		expect(() => parseLinkedinCsv('a,b\n1,2\n', 'Company Name')).toThrow(
			/Company Name/,
		);
	});
});

describe('positionsToEntries', () => {
	const row = {
		'Company Name': 'Acme',
		Title: 'Developer',
		Description: 'Builds things.',
		Location: 'Lleida',
		'Started On': 'Mar 2022',
		'Finished On': 'Jun 2023',
	};

	it('turns a position into a work entry', () => {
		expect(positionsToEntries([row])).toEqual({
			entries: [
				{
					kind: 'work',
					organization: 'Acme',
					role: 'Developer',
					summary: 'Builds things.',
					start: '2022-03',
					end: '2023-06',
					aliases: ['Acme'],
				},
			],
			skipped: [],
		});
	});

	it('marks a position without an end date as ongoing', () => {
		const { entries } = positionsToEntries([{ ...row, 'Finished On': '' }]);

		expect(entries[0]?.end).toBeNull();
	});

	it.each(['Present', 'present', 'Actualidad', 'Actualitat'])(
		'treats %j in the end column as "still going"',
		(word) => {
			const { entries } = positionsToEntries([
				{ ...row, 'Finished On': word },
			]);

			expect(entries[0]?.end).toBeNull();
		},
	);

	it('turns line breaks and control characters into spaces, so a text cannot start a log line or an escape sequence', () => {
		const { entries } = positionsToEntries([
			{
				...row,
				'Company Name': 'Acme\n::warning::x',
				Description: 'Line one\r\nLine two\u001b[31m red\u2028end',
			},
		]);

		expect(entries[0]?.organization).toBe('Acme ::warning::x');
		expect(entries[0]?.summary).toBe('Line one Line two [31m red end');
	});

	it('leaves the summary out when there is no description', () => {
		const { entries } = positionsToEntries([{ ...row, Description: '' }]);

		expect(entries[0]).not.toHaveProperty('summary');
	});

	it('uses the company as the role when the title is empty', () => {
		const { entries } = positionsToEntries([{ ...row, Title: '' }]);

		expect(entries[0]?.role).toBe('Acme');
	});

	it('names the title of a position without a company, or says it has none', () => {
		const withTitle = positionsToEntries([{ ...row, 'Company Name': '' }]);
		const bare = positionsToEntries([{ 'Started On': '2020' }]);

		expect(withTitle.skipped[0]).toContain('Developer');
		expect(bare.skipped[0]).toContain('sin título');
	});

	it('does not hide an unexpected error as if it were a skipped row', () => {
		const broken = new Proxy(
			{},
			{
				get() {
					throw new TypeError('boom');
				},
			},
		);

		expect(() => positionsToEntries([broken])).toThrow('boom');
	});

	it.each([
		[{ 'Company Name': '' }, /sin empresa/],
		[{ 'Started On': '' }, /sin fecha de inicio/],
		[{ 'Started On': 'Foo 2022' }, /Foo 2022/],
		[{ 'Finished On': 'Foo 2023' }, /Foo 2023/],
	])('skips, and says why, a position with %j', (override, reason) => {
		const result = positionsToEntries([{ ...row, ...override }, row]);

		expect(result.entries).toHaveLength(1);
		expect(result.skipped).toHaveLength(1);
		expect(result.skipped[0]).toMatch(reason);
	});
});

describe('educationToEntries', () => {
	const row = {
		'School Name': 'Institut Example',
		'Degree Name': 'CFGS DAW',
		'Start Date': '2022',
		'End Date': '2023',
		Notes: 'Web development.',
		Activities: '',
	};

	it('turns a degree into an education entry that can also be found by its degree name', () => {
		expect(educationToEntries([row])).toEqual({
			entries: [
				{
					kind: 'education',
					organization: 'Institut Example',
					role: 'CFGS DAW',
					summary: 'Web development.',
					start: '2022',
					end: '2023',
					aliases: ['Institut Example', 'CFGS DAW'],
				},
			],
			skipped: [],
		});
	});

	it('falls back to "Estudiante" when there is no degree name', () => {
		const { entries } = educationToEntries([{ ...row, 'Degree Name': '' }]);

		expect(entries[0]?.role).toBe('Estudiante');
		expect(entries[0]?.aliases).toEqual(['Institut Example']);
	});

	it('marks a degree without an end date as ongoing and leaves the notes out when empty', () => {
		const { entries } = educationToEntries([
			{ ...row, 'End Date': '', Notes: '' },
		]);

		expect(entries[0]?.end).toBeNull();
		expect(entries[0]).not.toHaveProperty('summary');
	});

	it('names the degree of a study without a school, or says it has none', () => {
		const withDegree = educationToEntries([{ ...row, 'School Name': '' }]);
		const bare = educationToEntries([{ 'Start Date': '2020' }]);

		expect(withDegree.skipped[0]).toContain('CFGS DAW');
		expect(bare.skipped[0]).toContain('sin título');
	});

	it.each([
		[{ 'School Name': '' }, /sin centro/],
		[{ 'Start Date': '' }, /sin fecha de inicio/],
		[{ 'End Date': 'Foo 2023' }, /Foo 2023/],
	])('skips, and says why, a degree with %j', (override, reason) => {
		const result = educationToEntries([{ ...row, ...override }, row]);

		expect(result.entries).toHaveLength(1);
		expect(result.skipped[0]).toMatch(reason);
	});
});
