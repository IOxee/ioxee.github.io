/**
 * Descarga de la API de LinkedIn las posiciones y los estudios y los guarda en un JSON. Es lo único
 * que ve el token (variable LINKEDIN_ACCESS_TOKEN) y carga solo el cliente de la API: el resto
 * (`import-linkedin`, con todas sus dependencias) lee ese JSON después, sin el token.
 *
 *   LINKEDIN_ACCESS_TOKEN=… node scripts/fetch-linkedin.ts <instantanea.json>
 *
 * Node 22.18 o superior.
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

	// Solo para quien la ejecuta: son datos personales aunque sean los de un perfil público.
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
