import 'dotenv/config';
import { initDb } from '$lib/server/db.js';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	await initDb();
	return resolve(event);
}
