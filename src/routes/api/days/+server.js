import { upsertDay, getPortionsForDay } from '$lib/server/db.js';
import { ok, fail, readJson } from '$lib/server/api.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST(event) {
	const payload = await readJson(event);
	if (!payload) {
		return fail('Ungueltiges JSON.');
	}

	const { date } = payload;
	if (!date || !DATE_RE.test(date)) {
		return fail('Ungueltiges Datum.');
	}

	const dayId = await upsertDay(date);
	const portions = await getPortionsForDay(dayId);
	return ok({ day: { id: dayId, entry_date: date }, portions }, 'Tag bereit.');
}
