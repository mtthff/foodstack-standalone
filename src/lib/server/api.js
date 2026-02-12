import { json } from '@sveltejs/kit';

/**
 * @template T
 * @param {T} data
 * @param {string} [message]
 */
export function ok(data, message = 'OK') {
	return json({ success: true, data, message });
}

/**
 * @param {string} message
 * @param {number} [status]
 */
export function fail(message, status = 400) {
	return json({ success: false, data: null, message }, { status });
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function readJson(event) {
	try {
		return await event.request.json();
	} catch {
		return null;
	}
}
