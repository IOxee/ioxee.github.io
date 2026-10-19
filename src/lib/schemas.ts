import { z } from 'astro/zod';
// Con extensión: el script `import-linkedin` ejecuta este archivo directamente con Node.
import { PARTIAL_DATE, partialDateKey } from './partial-date.ts';

export const SKILL_CATEGORIES = ['backend', 'frontend', 'data'] as const;
/** De mayor a menor uso; el orden define cómo se ordenan las habilidades dentro de un grupo. */
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
// Posición al mostrar la lista. Es explícita porque el almacén de contenido no conserva el orden del archivo.
const order = z.number().int().min(1);

// Estos enlaces acaban como `href`: solo https, para que ni un dato mal copiado ni un
// importador automático puedan colar `javascript:`, `file:` o `http:`. Además tiene que estar
// escrito entero (`https://…`: `https:web.com` sería una ruta del propio sitio) y sin usuario ni
// contraseña delante del dominio, que despistan sobre a qué web se va.
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
	// Una ruta del propio sitio: `//host/…` y `/\host/…` serían una dirección externa.
	// Opcional: sin CV la web no enseña el enlace de descarga.
	cv: z
		.string()
		.regex(
			/^\/(?![/\\])/,
			'Usa una ruta del sitio, con una sola / al principio',
		)
		.optional(),
});

/**
 * Un fin anterior al inicio es un error de datos. Si algún formato ya es inválido se deja
 * pasar: ese fallo lo reporta el campo concreto y comparar fechas rotas lanzaría una excepción.
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
	category: z.enum(SKILL_CATEGORIES),
	since: z.number().int().min(1990),
	state: z.enum(SKILL_STATES),
	/** `true` mientras `since` sea una estimación sin confirmar: la web no debe mostrar sus años. */
	provisional: z.boolean().optional(),
});

export const projectSchema = z
	.object({
		id,
		name: nonEmpty,
		summary: localizedText,
		stack: z.array(nonEmpty).min(1),
		/** Texto alternativo de la captura `src/assets/projects/<id>.png`: es contenido, no adorno. */
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

/** Certificaciones y cursos que no son formación reglada. */
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
		 * La foto (`src/assets/certifications/<id>.png|jpg|webp`) y el documento (`<id>.pdf`, en la misma
		 * carpeta) no se declaran aquí: salen solos si existe el archivo. Este texto, si se quiere, sustituye
		 * al alternativo automático de la foto («Certificado: {nombre}»).
		 */
		imageAlt: localizedText.optional(),
		order,
	})
	.refine(
		(entry) =>
			entry.expires === undefined ||
			// Si algún formato ya es inválido se deja pasar: lo reporta el campo concreto.
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
