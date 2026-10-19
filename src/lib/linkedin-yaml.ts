import { Scalar, type YAMLMap, isMap, isSeq, parse, parseDocument } from 'yaml';
import type { MergePlan } from './linkedin-merge.ts';
import { type ExperienceEntry, experienceSchema } from './schemas.ts';

const NOT_A_LIST = 'experience.yaml debe ser una lista de registros';

/** Una fecha como el resto del archivo: entre comillas simples; «en curso» es `null`. */
function dateNode(date: string | null): Scalar | null {
	if (date === null) return null;

	const node = new Scalar(date);
	node.type = Scalar.QUOTE_SINGLE;

	return node;
}

export function readExperience(yamlText: string): ExperienceEntry[] {
	const data: unknown = parse(yamlText);
	if (!Array.isArray(data)) throw new Error(NOT_A_LIST);

	const entries = data.map((item: unknown, index) => {
		const result = experienceSchema.safeParse(item);
		if (result.success) return result.data;

		const id =
			typeof item === 'object' && item !== null && 'id' in item
				? String(item.id)
				: `n.º ${index + 1}`;
		const problems = result.error.issues
			.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
			.join('; ');

		throw new Error(`Registro «${id}»: ${problems}`);
	});

	const seen = new Set<string>();
	for (const { id } of entries) {
		if (seen.has(id)) throw new Error(`Registro «${id}»: id repetido`);
		seen.add(id);
	}

	return entries;
}

/**
 * Aplica un plan de fusión al texto de `experience.yaml` sin tocar el resto: los comentarios, las
 * líneas en blanco y los textos de los registros siguen como estaban. Los registros nuevos van al
 * final con una nota que pide revisar el texto que viene de LinkedIn.
 */
export function applyPlan(
	yamlText: string,
	plan: MergePlan,
	importedOn: string,
): string {
	const document = parseDocument(yamlText);
	// Como `unknown`: los nodos de un documento leído están tipados con más detalle del que hace
	// falta para añadir y cambiar valores.
	const contents: unknown = document.contents;
	if (!isSeq(contents)) throw new Error(NOT_A_LIST);
	const list = contents;

	for (const update of plan.updates) {
		const entry = list.items.find(
			(item) => isMap(item) && item.get('id') === update.id,
		);
		if (!isMap(entry)) {
			throw new Error(
				`No encuentro el registro «${update.id}» en experience.yaml`,
			);
		}

		for (const change of update.changes) {
			entry.set(change.field, dateNode(change.to));
		}
	}

	for (const added of plan.additions) {
		// Un objeto siempre se convierte en un mapa.
		const node = document.createNode(added) as YAMLMap;
		node.set('start', dateNode(added.start));
		node.set('end', dateNode(added.end));
		node.spaceBefore = true;
		node.commentBefore = ` Importado de LinkedIn el ${importedOn}: revisa el texto.`;
		list.add(node);
	}

	// Mismo estilo que el archivo: sangrado de 4 y sin partir las líneas largas. Sin esto, `yaml`
	// reescribiría también los registros que no cambian y el diff del PR sería ilegible.
	// Comillas simples, como las deja Prettier: así el siguiente `format:check` no protesta.
	const output = document.toString({
		indent: 4,
		lineWidth: 0,
		singleQuote: true,
	});

	return yamlText.includes('\r\n') ? output.replaceAll('\n', '\r\n') : output;
}
