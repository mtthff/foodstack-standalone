import { getItemById, updateItem, deleteItem } from '$lib/server/db.js';
import { ok, fail, readJson } from '$lib/server/api.js';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ params }) {
	const id = Number(params.id);
	if (!Number.isInteger(id)) {
		return fail('Ungueltige ID.');
	}

	const item = await getItemById(id);
	if (!item) {
		return fail('Nicht gefunden.', 404);
	}

	return ok(item);
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

	const { label, recommended_portions: recommendedPortions, tier, item_order: itemOrder } = payload;
	if (!label || !Number.isInteger(recommendedPortions) || !Number.isInteger(tier) || !Number.isInteger(itemOrder)) {
		return fail('Pflichtfelder fehlen.');
	}

	await updateItem(id, label, recommendedPortions, tier, itemOrder);
	return ok({ id }, 'Item aktualisiert.');
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function DELETE({ params }) {
	const id = Number(params.id);
	if (!Number.isInteger(id)) {
		return fail('Ungueltige ID.');
	}

	await deleteItem(id);
	return ok({ id }, 'Item geloescht.');
}
