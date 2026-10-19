import { describe, expect, it } from 'vitest';
import { certificationMeta, certificationStatus } from './certifications';

const on = (year: number, month: number, day: number): Date =>
	new Date(year, month - 1, day);

describe('certificationStatus', () => {
	it('is "no-expiry" when the certification does not expire', () => {
		expect(certificationStatus({}, on(2026, 10, 11))).toBe('no-expiry');
		expect(
			certificationStatus({ expires: undefined }, on(2040, 1, 1)),
		).toBe('no-expiry');
	});

	it('is "valid" until the end of the month it expires in', () => {
		const entry = { expires: '2026-10' };

		expect(certificationStatus(entry, on(2026, 9, 30))).toBe('valid');
		expect(certificationStatus(entry, on(2026, 10, 1))).toBe('valid');
		expect(certificationStatus(entry, on(2026, 10, 31))).toBe('valid');
	});

	it('is "expired" from the first day after that month', () => {
		expect(
			certificationStatus({ expires: '2026-10' }, on(2026, 11, 1)),
		).toBe('expired');
		expect(
			certificationStatus({ expires: '2026-10' }, on(2027, 1, 1)),
		).toBe('expired');
	});

	it('treats an expiry with only a year as the end of that year', () => {
		const entry = { expires: '2026' };

		expect(certificationStatus(entry, on(2026, 12, 31))).toBe('valid');
		expect(certificationStatus(entry, on(2027, 1, 1))).toBe('expired');
	});

	it('uses today when no date is given', () => {
		expect(certificationStatus({ expires: '1999' })).toBe('expired');
		expect(certificationStatus({ expires: '9999' })).toBe('valid');
	});
});

describe('certificationMeta', () => {
	const labels = {
		validUntil: 'Vigente hasta {date}',
		expired: 'Caducada en {date}',
	};
	const base = { issuer: 'Academia', issued: '2024-03' };

	it('says who issued it and when, and nothing else when it does not expire', () => {
		expect(certificationMeta(base, labels, on(2026, 10, 11))).toBe(
			'Academia · 03/2024',
		);
	});

	it('adds until when it is valid while it still is', () => {
		expect(
			certificationMeta(
				{ ...base, expires: '2027-06' },
				labels,
				on(2026, 10, 11),
			),
		).toBe('Academia · 03/2024 · Vigente hasta 06/2027');
	});

	it('says when it expired once it has', () => {
		expect(
			certificationMeta(
				{ ...base, issued: '2022', expires: '2025' },
				labels,
				on(2026, 10, 11),
			),
		).toBe('Academia · 2022 · Caducada en 2025');
	});
});
