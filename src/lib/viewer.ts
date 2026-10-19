export type ViewerKind = 'image' | 'pdf';

export interface ClickLike {
	button: number;
	ctrlKey: boolean;
	metaKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
}

/**
 * Si un clic en el enlace de una foto o de un documento lo atiende el visor de la página o lo sigue
 * el navegador. El enlace es siempre un enlace de verdad (sin JavaScript, o si el visor no puede
 * mostrarlo, se abre en otra pestaña), así que el visor solo se queda con el clic normal:
 *  - Con Ctrl, Cmd, Mays o Alt, o con el botón del medio o el derecho, la persona pidió otra
 *    pestaña o ventana: no se le quita.
 *  - Un PDF dentro de la página exige que el navegador traiga visor de PDF (`pdfViewerEnabled`). En
 *    un móvil sin él, el marco quedaría en blanco o descargaría el archivo. Si el navegador no lo
 *    dice, no se supone que lo tenga.
 */
export function opensInViewer(
	kind: ViewerKind,
	click: ClickLike,
	pdfViewerEnabled: boolean | undefined,
): boolean {
	if (
		click.button !== 0 ||
		click.ctrlKey ||
		click.metaKey ||
		click.shiftKey ||
		click.altKey
	) {
		return false;
	}

	return kind === 'image' || pdfViewerEnabled === true;
}

/**
 * La dirección con la que se carga un PDF en el marco del visor: el visor del navegador lo ajusta al
 * ancho y esconde el panel lateral de miniaturas (Chrome, Edge y Firefox entienden estos parámetros).
 */
export function pdfFrameUrl(href: string): string {
	const [address = ''] = href.split('#');

	return `${address}#navpanes=0&view=FitH`;
}
