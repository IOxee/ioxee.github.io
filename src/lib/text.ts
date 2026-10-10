/**
 * Rellena los `{clave}` de una plantilla. Usa una función como reemplazo a propósito: con una
 * cadena, `$&` o `$1` dentro de un valor se interpretarían como patrones de reemplazo.
 */
export function fill(
	template: string,
	values: Readonly<Record<string, string>>,
): string {
	return template.replace(
		/\{(\w+)\}/g,
		(placeholder, key: string) => values[key] ?? placeholder,
	);
}
