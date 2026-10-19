/**
 * Downloads positions and education from the LinkedIn API into a JSON file. It is the only thing that sees the token
 * (LINKEDIN_ACCESS_TOKEN) and it only loads the API client; `import-linkedin` reads that JSON afterwards, without the token.
 *
 *   LINKEDIN_ACCESS_TOKEN=… node scripts/fetch-linkedin.ts <snapshot.json>
 */
import { writeFileSync } from 'node:fs';
import { fetchSnapshotDomain } from '../src/lib/linkedin-api.ts';

const USAGE =
	'Uso: LINKEDIN_ACCESS_TOKEN=… node scripts/fetch-linkedin.ts <instantanea.json>';

async function main(): Promise<void> {
	const output = process.argv[2];
	if (output === undefined) {
		throw new Error(
			`Falta la ruta donde guardar la instantánea.\n${USAGE}`,
		);
	}

	const token = process.env.LINKEDIN_ACCESS_TOKEN ?? '';
	const positions = await fetchSnapshotDomain('POSITIONS', token);
	const education = await fetchSnapshotDomain('EDUCATION', token);

	// Only for whoever runs it: it is personal data even though it comes from a public profile.
	writeFileSync(
		output,
		`${JSON.stringify({ positions, education }, null, 2)}\n`,
		{ mode: 0o600 },
	);
	console.log(
		`Instantánea guardada en ${output}: ${positions.length} posiciones, ${education.length} estudios.`,
	);
}

main().catch((error: unknown) => {
	console.error(
		`Error: ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exitCode = 1;
});
