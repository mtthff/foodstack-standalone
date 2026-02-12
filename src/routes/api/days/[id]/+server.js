import { getDayById, updateDay, deleteDay, ensurePortionRows, getPortionsForDay } from '$lib/server/db.js';
import { ok, fail, readJson } from '$lib/server/api.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ params }) {
	const id = Number(params.id);
	if (!Number.isInteger(id)) {
		return fail('Ungueltige ID.');
	}

	const day = await getDayById(id);
	if (!day) {
		return fail('Nicht gefunden.', 404);
	}

	await ensurePortionRows(id);
	const portions = await getPortionsForDay(id);
	return ok({ day, portions });
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function PUT(event) {
	const id = Number(event.params.id);
	if (!Number.isInteger(id)) {
		return fail('Ungueltige ID.');
	}

	const payload = await readJson(event);
	if (!payload) {
		return fail('Ungueltiges JSON.');
	}

	const { date } = payload;
	if (!date || !DATE_RE.test(date)) {
		return fail('Ungueltiges Datum.');
	}

	await updateDay(id, date);
	const newId = Number(date.replace(/-/g, ''));
	return ok({ id: newId, entry_date: date }, 'Tag aktualisiert.');
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function DELETE({ params }) {
	const id = Number(params.id);
	if (!Number.isInteger(id)) {
		return fail('Ungueltige ID.');
	}

	await deleteDay(id);
	return ok({ id }, 'Tag geloescht.');
}
