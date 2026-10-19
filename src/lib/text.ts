/**
 * Fills in the `{key}` placeholders of a template. It uses a function as the replacement on purpose: with a
 * string, `$&` or `$1` inside a value would be interpreted as replacement patterns.
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
