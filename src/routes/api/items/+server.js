import { getAllItems, createItem } from '$lib/server/db.js';
import { ok, fail, readJson } from '$lib/server/api.js';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET() {
	const items = await getAllItems();
	return ok(items.sort((a, b) => a.tier - b.tier || a.item_order - b.item_order));
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST(event) {
	const payload = await readJson(event);
	if (!payload) {
		return fail('Ungueltiges JSON.');
	}

	const { label, recommended_portions: recommendedPortions, tier, item_order: itemOrder } = payload;
	if (!label || !Number.isInteger(recommendedPortions) || !Number.isInteger(tier) || !Number.isInteger(itemOrder)) {
		return fail('Pflichtfelder fehlen.');
	}

	const id = await createItem(label, recommendedPortions, tier, itemOrder);
	return ok({ id }, 'Item erstellt.');
}
