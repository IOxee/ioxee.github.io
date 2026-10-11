import { defineConfig } from 'vitest/config';

// Tests sobre el sitio ya compilado (`dist/`). Van aparte de `vitest.config.ts` porque necesitan
// `npm run build` antes: se lanzan con `npm run test:dist`.
export default defineConfig({
	test: {
		include: ['tests/build/**/*.test.ts'],
		environment: 'node',
	},
});
