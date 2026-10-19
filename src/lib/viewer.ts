export type ViewerKind = 'image' | 'pdf';

export interface ClickLike {
	button: number;
	ctrlKey: boolean;
	metaKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
}

/**
 * Whether a click on the link of a photo or a document is handled by the page's viewer or followed
 * by the browser. The link is always a real link (without JavaScript, or if the viewer cannot
 * show it, it opens in another tab), so the viewer only takes the plain click:
 *  - With Ctrl, Cmd, Shift or Alt, or with the middle or right button, the person asked for another
 *    tab or window: it is not taken away.
 *  - A PDF inside the page requires the browser to have a PDF viewer (`pdfViewerEnabled`). On
 *    a phone without one, the frame would stay blank or download the file. If the browser does not
 *    say so, it is not assumed to have one.
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
 * The address a PDF is loaded with in the viewer's frame: the browser's viewer fits it to the
 * width and hides the thumbnails side panel (Chrome, Edge and Firefox understand these parameters).
 */
export function pdfFrameUrl(href: string): string {
	const [address = ''] = href.split('#');

	return `${address}#navpanes=0&view=FitH`;
}
