import { ensurePortionRows, getPortionsForDay, incrementPortion, setPortion } from '$lib/server/db.js';
import { ok, fail, readJson } from '$lib/server/api.js';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ params }) {
	const dayId = Number(params.id);
	if (!Number.isInteger(dayId)) {
		return fail('Ungueltige ID.');
	}

	await ensurePortionRows(dayId);
	const portions = await getPortionsForDay(dayId);
	return ok(portions);
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST(event) {
	const dayId = Number(event.params.id);
	if (!Number.isInteger(dayId)) {
		return fail('Ungueltige ID.');
	}

	const payload = await readJson(event);
	if (!payload) {
		return fail('Ungueltiges JSON.');
	}

	const { itemId, delta } = payload;
	if (!Number.isInteger(itemId) || !Number.isInteger(delta)) {
		return fail('Pflichtfelder fehlen.');
	}

	const portions = await incrementPortion(dayId, itemId, delta);
	return ok({ itemId, portions }, 'Portionen aktualisiert.');
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function PUT(event) {
	const dayId = Number(event.params.id);
	if (!Number.isInteger(dayId)) {
		return fail('Ungueltige ID.');
	}

	const payload = await readJson(event);
	if (!payload) {
		return fail('Ungueltiges JSON.');
	}

	const { itemId, portions } = payload;
	if (!Number.isInteger(itemId) || !Number.isInteger(portions)) {
		return fail('Pflichtfelder fehlen.');
	}

	const value = await setPortion(dayId, itemId, Math.max(portions, 0));
	return ok({ itemId, portions: value }, 'Portionen gesetzt.');
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function DELETE({ params, url }) {
	const dayId = Number(params.id);
	if (!Number.isInteger(dayId)) {
		return fail('Ungueltige ID.');
	}

	const itemId = Number(url.searchParams.get('itemId'));
	if (!Number.isInteger(itemId)) {
		return fail('Ungueltige Item-ID.');
	}

	await setPortion(dayId, itemId, 0);
	return ok({ itemId, portions: 0 }, 'Portionen zurueckgesetzt.');
}
