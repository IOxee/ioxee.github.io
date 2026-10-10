/** `https://www.linkedin.com/in/ioxee/?x=1` → `linkedin.com/in/ioxee`: el texto legible de un enlace. */
export function displayUrl(url: string): string {
	const { host, pathname } = new URL(url);

	return `${host.replace(/^www\./, '')}${pathname.replace(/\/+$/, '')}`;
}
