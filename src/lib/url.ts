/** `https://www.linkedin.com/in/ioxee/?x=1` → `linkedin.com/in/ioxee`: the readable text of a link. */
export function displayUrl(url: string): string {
	const { host, pathname } = new URL(url);

	return `${host.replace(/^www\./, '')}${pathname.replace(/\/+$/, '')}`;
}
