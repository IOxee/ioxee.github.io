import { z } from 'astro/zod';
// With extension: the `import-linkedin` script runs this file directly with Node.
import { PARTIAL_DATE, partialDateKey } from './partial-date.ts';

/** Categories shown first, in this order. Any other category is allowed and goes after them, alphabetically. */
export const PREFERRED_SKILL_CATEGORIES = [
	'backend',
	'frontend',
	'data',
	'desktop',
] as const;
/** From most to least used; the order defines how skills are sorted within a group. */
export const SKILL_STATES = [
	'daily',
	'comfortable',
	'intermediate',
	'basic',
] as const;
export const EXPERIENCE_KINDS = ['work', 'education'] as const;
export const LANGUAGE_LEVELS = ['native', 'high', 'medium', 'basic'] as const;

const nonEmpty = z.string().trim().min(1);
const id = z
	.string()
	.regex(
		/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
		'Usa kebab-case: minúsculas, números y guiones',
	);
const partialDate = z.string().regex(PARTIAL_DATE, 'Usa AAAA o AAAA-MM');
// Position when displaying the list. It is explicit because the content store does not keep the file's order.
const order = z.number().int().min(1);

// These links end up as `href`: https only, so that neither a badly copied value nor an
// automatic importer can sneak in `javascript:`, `file:` or `http:`. It also has to be
// written in full (`https://…`: `https:web.com` would be a path on the site itself) and without a username or
// password before the domain, which mislead about which site you are going to.
const httpsUrl = z.url({ protocol: /^https$/ }).refine(
	(value) => {
		const url = URL.parse(value);

		return (
			value.startsWith('https://') &&
			url !== null &&
			url.username === '' &&
			url.password === ''
		);
	},
	{ error: 'Usa una dirección https:// completa, sin usuario ni contraseña' },
);

const localizedText = z.object({
	es: nonEmpty,
	ca: nonEmpty.optional(),
	en: nonEmpty.optional(),
});

const localizedParagraphs = z.object({
	es: z.array(nonEmpty).min(1),
	ca: z.array(nonEmpty).min(1).optional(),
	en: z.array(nonEmpty).min(1).optional(),
});

export const profileSchema = z.object({
	id,
	name: nonEmpty,
	headline: localizedText,
	birthDate: z.iso.date(),
	nationality: localizedText,
	location: localizedText,
	occupation: localizedText,
	about: localizedParagraphs,
	links: z.object({
		github: httpsUrl,
		linkedin: httpsUrl,
		email: z.email(),
		company: httpsUrl.optional(),
	}),
	// A path on the site itself: `//host/…` and `/\host/…` would be an external address.
	// Optional: without a CV the site does not show the download link.
	cv: z
		.string()
		.regex(
			/^\/(?![/\\])/,
			'Usa una ruta del sitio, con una sola / al principio',
		)
		.optional(),
});

/**
 * An end before the start is a data error. If some format is already invalid it is let
 * through: that failure is reported by the specific field and comparing broken dates would throw an exception.
 */
const endsAfterStart = (entry: {
	start: string;
	end: string | null;
}): boolean => {
	if (entry.end === null) return true;
	if (!PARTIAL_DATE.test(entry.start) || !PARTIAL_DATE.test(entry.end))
		return true;

	return (
		partialDateKey(entry.end, 'end') >= partialDateKey(entry.start, 'start')
	);
};

export const experienceSchema = z
	.object({
		id,
		kind: z.enum(EXPERIENCE_KINDS),
		organization: nonEmpty.optional(),
		role: localizedText,
		summary: localizedText,
		start: partialDate,
		end: partialDate.nullable(),
	})
	.refine(endsAfterStart, {
		error: 'El fin no puede ser anterior al inicio',
		path: ['end'],
	});

export const skillSchema = z.object({
	id,
	name: nonEmpty,
	category: id,
	since: z.number().int().min(1990),
	state: z.enum(SKILL_STATES),
	/** `true` while `since` is an unconfirmed estimate: the site must not show its years. */
	provisional: z.boolean().optional(),
});

export const projectSchema = z
	.object({
		id,
		name: nonEmpty,
		summary: localizedText,
		stack: z.array(nonEmpty).min(1),
		/** Alt text of the screenshot `src/assets/projects/<id>.png`: it is content, not decoration. */
		imageAlt: localizedText,
		repo: httpsUrl,
		start: partialDate,
		end: partialDate.nullable(),
		details: z
			.object({
				intro: localizedText,
				points: localizedParagraphs,
				closing: localizedText.optional(),
			})
			.optional(),
	})
	.refine(endsAfterStart, {
		error: 'El fin no puede ser anterior al inicio',
		path: ['end'],
	});

/** Certifications and courses that are not formal education. */
export const certificationSchema = z
	.object({
		id,
		name: nonEmpty,
		issuer: nonEmpty,
		issued: partialDate,
		expires: partialDate.optional(),
		url: httpsUrl.optional(),
		summary: localizedText.optional(),
		/**
		 * The photo (`src/assets/certifications/<id>.png|jpg|webp`) and the document (`<id>.pdf`, in the same
		 * folder) are not declared here: they appear on their own if the file exists. This text, if provided, replaces
		 * the photo's automatic alt text ("Certificado: {nombre}").
		 */
		imageAlt: localizedText.optional(),
		order,
	})
	.refine(
		(entry) =>
			entry.expires === undefined ||
			// If some format is already invalid it is let through: the specific field reports it.
			!PARTIAL_DATE.test(entry.issued) ||
			!PARTIAL_DATE.test(entry.expires) ||
			partialDateKey(entry.expires, 'end') >=
				partialDateKey(entry.issued, 'start'),
		{
			error: 'La caducidad no puede ser anterior a la emisión',
			path: ['expires'],
		},
	);

export const languageSchema = z.object({
	id,
	name: localizedText,
	level: z.enum(LANGUAGE_LEVELS),
	order,
});

export type Profile = z.infer<typeof profileSchema>;
export type ExperienceEntry = z.infer<typeof experienceSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Language = z.infer<typeof languageSchema>;
export type Certification = z.infer<typeof certificationSchema>;
