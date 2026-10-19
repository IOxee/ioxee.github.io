import { formatPartialDate } from './experience';
import { partialDateKey } from './partial-date';
import { fill } from './text';

export type CertificationStatus = 'valid' | 'expired' | 'no-expiry';

/**
 * Whether a certification is still valid on `today`. An expiry date without a month closes in
 * December, and a whole month counts as valid through its last day: it does not expire early.
 * It is computed at build time, so the daily deploy keeps it up to date.
 */
export function certificationStatus(
	certification: { readonly expires?: string | undefined },
	today: Date = new Date(),
): CertificationStatus {
	if (certification.expires === undefined) return 'no-expiry';

	const todayKey = today.getFullYear() * 100 + (today.getMonth() + 1);

	return todayKey > partialDateKey(certification.expires, 'end')
		? 'expired'
		: 'valid';
}

export interface CertificationLabels {
	validUntil: string;
	expired: string;
}

export function certificationMeta(
	certification: {
		readonly issuer: string;
		readonly issued: string;
		readonly expires?: string | undefined;
	},
	labels: CertificationLabels,
	today: Date = new Date(),
): string {
	const { issuer, issued, expires } = certification;
	const parts = [issuer, formatPartialDate(issued)];
	if (expires !== undefined) {
		const template =
			certificationStatus(certification, today) === 'expired'
				? labels.expired
				: labels.validUntil;
		parts.push(fill(template, { date: formatPartialDate(expires) }));
	}

	return parts.join(' · ');
}
