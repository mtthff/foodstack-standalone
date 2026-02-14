import { getAllDays, getDayById, upsertDay, ensurePortionRows, getPortionsForDay, cleanupEmptyDays } from '$lib/server/db.js';
import { ok, fail, readJson } from '$lib/server/api.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ url }) {
	const date = url.searchParams.get('date');

	if (date) {
		if (!DATE_RE.test(date)) {
			return fail('Ungueltiges Datum.');
		}

		const dayId = Number(date.replace(/-/g, ''));
		const day = await getDayById(dayId);
		if (!day) {
			return ok(null, 'Kein Eintrag fuer diesen Tag.');
		}

		await ensurePortionRows(dayId);
		const portions = await getPortionsForDay(dayId);
		return ok({ day, portions });
	}

	const days = await getAllDays();
	return ok(days);
}

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
	await cleanupEmptyDays([date]);
	await ensurePortionRows(dayId);
	const portions = await getPortionsForDay(dayId);
	return ok({ day: { id: dayId, entry_date: date }, portions }, 'Tag bereit.');
}
