// Fija el tema antes de pintar para que no haya parpadeo. Base.astro lo incrusta en el <head> y
// astro.config.mjs calcula su hash para la CSP a partir de este mismo archivo.
(function () {
	var root = document.documentElement;
	var theme = null;
	// Marca que hay JS: sin esta clase el CSS esconde el botón de tema, que no haría nada.
	root.classList.add('js');
	try {
		theme = localStorage.getItem('ioxee:theme');
	} catch (error) {
		// Sin almacenamiento (modo privado): se usa la preferencia del sistema.
	}
	if (theme !== 'day' && theme !== 'night') {
		theme = matchMedia('(prefers-color-scheme: dark)').matches
			? 'night'
			: 'day';
	}
	root.dataset.theme = theme;
})();
