import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
		environment: 'node',
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.ts'],
			exclude: ['src/lib/**/*.test.ts'],
			// `perFile`: un archivo sin tests no se esconde detrás de la media de los demás.
			thresholds: {
				perFile: true,
				statements: 80,
				branches: 80,
				functions: 80,
				lines: 80,
			},
		},
	},
});
