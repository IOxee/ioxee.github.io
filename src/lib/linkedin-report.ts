import type { MergePlan } from './linkedin-merge.ts';

interface Report {
	plan: MergePlan;
	skipped: readonly string[];
	write: boolean;
}

const show = (date: string | null): string => date ?? 'en curso';

const SENSITIVE: readonly [string, RegExp][] = [
	['correo', /[^\s@]+@[^\s@]+\.[^\s@]+/],
	['teléfono', /(?:\+|00)?\d(?:[\s().-]?\d){8,}/],
	['enlace', /\bhttps?:\/\/|\bwww\./i],
];

/**
 * Lo que parece un dato personal en un texto que va a ser público (correo, teléfono, enlace). Es
 * un aviso, no un filtro: LinkedIn lo deja escribir en las descripciones.
 */
export function sensitiveHints(text: string): string[] {
	return SENSITIVE.filter(([, pattern]) => pattern.test(text)).map(
		([name]) => name,
	);
}

export function formatReport({ plan, skipped, write }: Report): string {
	const lines = [
		write
			? 'LinkedIn → experience.yaml: cambios aplicados.'
			: 'LinkedIn → experience.yaml (simulación: no se ha escrito nada; usa --write para aplicar).',
	];

	if (plan.updates.length > 0) {
		lines.push('', `Fechas que cambian (${plan.updates.length}):`);
		for (const update of plan.updates) {
			lines.push(`  ${update.id}`);
			for (const change of update.changes) {
				lines.push(
					`    ${change.field}: ${show(change.from)} → ${show(change.to)}`,
				);
			}
		}
	}

	if (plan.additions.length > 0) {
		lines.push(
			'',
			`Registros nuevos (${plan.additions.length}), con el texto tal como viene de LinkedIn: revisa que esté bien escrito.`,
		);
		for (const added of plan.additions) {
			lines.push(
				`  + ${added.organization} (${added.kind}, ${show(added.start)} → ${show(added.end)}) «${added.role.es}» [${added.id}]`,
			);
			const hints = sensitiveHints(
				`${added.role.es} ${added.summary.es}`,
			);
			if (hints.length > 0) {
				lines.push(
					`    ⚠ el texto parece incluir ${hints.join(', ')}: quítalo antes de publicar`,
				);
			}
		}
	}

	if (plan.onlyOnSite.length > 0) {
		lines.push(
			'',
			`Solo en la web, no están en LinkedIn (${plan.onlyOnSite.length}); se conservan:`,
			...plan.onlyOnSite.map((id) => `  ${id}`),
		);
	}

	if (skipped.length > 0) {
		lines.push(
			'',
			`No importadas (${skipped.length}):`,
			...skipped.map((reason) => `  ${reason}`),
		);
	}

	const matching = `${plan.unchanged.length} ya coinciden con LinkedIn.`;
	if (plan.updates.length + plan.additions.length === 0) {
		lines.push('', `Nada que cambiar: ${matching}`);
	} else if (plan.unchanged.length > 0) {
		lines.push('', `Sin cambios: ${matching}`);
	}

	return lines.join('\n');
}
