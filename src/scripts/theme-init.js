// Sets the theme before painting, with no flash. `Base.astro` inlines it and `astro.config.mjs` computes its hash
// for the CSP from this same file.
(function () {
	var root = document.documentElement;
	var theme = null;
	// Marks that JS is available: without this class the CSS hides the theme button, which would do nothing.
	root.classList.add('js');
	try {
		theme = localStorage.getItem('ioxee:theme');
	} catch (error) {
		// No storage (private mode): the system preference is used.
	}
	if (theme !== 'day' && theme !== 'night') {
		theme = matchMedia('(prefers-color-scheme: dark)').matches
			? 'night'
			: 'day';
	}
	root.dataset.theme = theme;
})();
