import { getPortionsForDay } from '$lib/server/db.js';
import { ok } from '$lib/server/api.js';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ params }) {
	const id = Number(params.id);
	const portions = await getPortionsForDay(id);
	return ok({ day: { id }, portions });
}
