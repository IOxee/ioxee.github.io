import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
		environment: 'node',
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.ts'],
			exclude: ['src/lib/**/*.test.ts'],
			// `perFile`: a file without tests is not hidden behind the average of the others.
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
